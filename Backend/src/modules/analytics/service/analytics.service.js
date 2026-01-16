const analyticsRepository = require('../repository/analytics.repository');
const geminiService = require('../../llm/service/gemini.service');
const { Op, Survey } = require('sequelize');
const { Survey: SurveyModel } = require('../../../models');
const activityService = require('../../workspaces/service/activity.service');
const logger = require('../../../utils/logger');

class AnalyticsService {
    constructor() {
        // No need to initialize LLMService here anymore for insights
    }

    /**
     * Get Overview Statistics
     */
    async getOverview(surveyId, filters = null) {
        try {
            const survey = await analyticsRepository.getSurveyDetails(surveyId);

            // Get filtered response IDs if filters exist
            let filterResponseIds = null;
            if (filters) {
                filterResponseIds = await analyticsRepository.getResponseIdsByFilter(surveyId, filters);
            }

            if (!survey) {
                throw new Error('Survey not found');
            }

            let responses = survey.SurveyResponses || [];

            // Apply filter intersection if needed
            if (filterResponseIds) {
                responses = responses.filter(r => filterResponseIds.includes(r.id));
            }

            const totalResponses = responses.length;
            const completedResponses = responses.filter(r => r.status === 'completed').length;
            const dropOffResponses = totalResponses - completedResponses;

            // Calculate completion rate
            const completionRate = totalResponses > 0
                ? ((completedResponses / totalResponses) * 100).toFixed(1)
                : 0;

            // Calculate average time (use time_taken if available, or compute from start/end)
            const completedWithTime = responses.filter(r => r.status === 'completed' && r.time_taken > 0);

            console.log(`[AnalyticsService] Survey ${surveyId} timing analysis:`);
            console.log(`  Total responses: ${totalResponses}`);
            console.log(`  Completed responses: ${completedResponses}`);
            console.log(`  Completed with valid time_taken: ${completedWithTime.length}`);

            let avgTimeSeconds = null;
            if (completedWithTime.length > 0) {
                const totalTime = completedWithTime.reduce((acc, curr) => acc + curr.time_taken, 0);
                avgTimeSeconds = Math.round(totalTime / completedWithTime.length);
                console.log(`  Average time: ${avgTimeSeconds} seconds`);
                completedWithTime.forEach(r => {
                    console.log(`    Response ${r.id}: ${r.time_taken}s`);
                });
            } else {
                console.log(`  No valid timing data found`);
            }

            // Time series data (responses per day)
            const timeSeriesMap = {};
            responses.forEach(r => {
                if (r.created_at) {
                    const date = new Date(r.created_at).toISOString().split('T')[0];
                    timeSeriesMap[date] = (timeSeriesMap[date] || 0) + 1;
                }
            });

            // Ensure last 7 days are represented if empty
            // (Optional: keep deterministic from DB only, as requested. So no fake filling.)

            const timeSeries = Object.entries(timeSeriesMap)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            const result = {
                totalResponses,
                completedResponses,
                dropOffResponses,
                completionRate,
                avgTimeSeconds, // Nullable
                questionsCount: survey.Questions ? survey.Questions.length : 0,
                timeSeries
            };

            return result;
        } catch (error) {
            console.error('[AnalyticsService] getOverview ERROR:', error);
            throw error;
        }
    }

    /**
     * Get Question-Level Analysis (Enhanced)
     */
    async getQuestionAnalysis(surveyId, filters = null) {
        let responseIds = null;
        if (filters) {
            responseIds = await analyticsRepository.getResponseIdsByFilter(surveyId, filters);
        }

        const questions = await analyticsRepository.getSurveyQuestions(surveyId);
        const responses = await analyticsRepository.getSurveyResponses(surveyId, responseIds);
        const totalResponses = responses.length;

        const analysis = questions.map(question => {
            const questionId = question.id;
            const questionType = (question.QuestionType && question.QuestionType.type_name) ? question.QuestionType.type_name : 'text';

            // Filter answers for this question
            const answers = [];
            responses.forEach(r => {
                if (r.Answers) {
                    const ans = r.Answers.filter(a => a.question_id === questionId);
                    if (ans.length > 0) {
                        answers.push(...ans);
                    }
                }
            });

            const answeredCount = answers.length;
            const missingCount = totalResponses - answeredCount; // Approximate (skipped or drop-off before)
            const skipRate = totalResponses > 0 ? ((missingCount / totalResponses) * 100).toFixed(1) : 0;
            const isHighSkipRate = parseFloat(skipRate) > 30;

            let stats = {};

            if (['single_choice', 'multiple_choice', 'dropdown', 'checkbox'].includes(questionType)) {
                // Count options
                const counts = {};
                const optionMap = {}; // id -> text

                if (question.QuestionOptions) {
                    question.QuestionOptions.forEach(opt => {
                        optionMap[opt.id] = opt.option_text;
                        counts[opt.option_text] = 0; // Initialize
                    });
                }

                answers.forEach(a => {
                    let key = null;
                    // Prefer option_id lookup
                    if (a.option_id && optionMap[a.option_id]) {
                        key = optionMap[a.option_id];
                    } else {
                        // Fallback to text_answer or raw id
                        key = a.text_answer || (a.option_id ? `Option ${a.option_id}` : 'Unknown');
                    }

                    if (key) {
                        counts[key] = (counts[key] || 0) + 1;
                    }
                });

                // Calculate percents and top option
                const optionPercents = {};
                let maxCount = -1;
                let topOption = null;

                Object.entries(counts).forEach(([key, count]) => {
                    optionPercents[key] = answeredCount > 0 ? ((count / answeredCount) * 100).toFixed(1) : 0;
                    if (count > maxCount) {
                        maxCount = count;
                        topOption = key;
                    }
                });

                stats = {
                    type: 'choice',
                    counts,
                    optionPercents,
                    answeredCount,
                    missingCount,
                    topOption
                };
            } else if (['rating', 'likert_scale', 'number'].includes(questionType)) {
                // Numeric Analysis
                const values = answers
                    .map(a => parseFloat(a.numeric_answer || a.text_answer))
                    .filter(v => !isNaN(v));

                if (values.length > 0) {
                    const sum = values.reduce((a, b) => a + b, 0);
                    const avg = sum / values.length;
                    const min = Math.min(...values);
                    const max = Math.max(...values);

                    // Distribution buckets
                    const distribution = {};
                    values.forEach(v => {
                        distribution[v] = (distribution[v] || 0) + 1;
                    });

                    stats = {
                        type: 'numeric',
                        average: avg.toFixed(2),
                        min,
                        max,
                        count: values.length,
                        distribution
                    };
                } else {
                    stats = { type: 'numeric', average: 0, count: 0, distribution: {} };
                }
            } else {
                // Text Analysis
                let spamCount = 0;
                let validCount = 0;

                const textAnswers = answers
                    .map(a => a.text_answer)
                    .filter(t => {
                        if (!t) return false;
                        const trimmed = t.trim();
                        if (trimmed.length < 3) return false;

                        // Spam check logic
                        const uniqueChars = new Set(trimmed.split('')).size;
                        if (trimmed.length > 6 && uniqueChars === 1) {
                            spamCount++;
                            return false;
                        }

                        validCount++;
                        return true;
                    });

                const validRate = totalResponses > 0 ? ((validCount / totalResponses) * 100).toFixed(1) : 0;

                stats = {
                    type: 'text',
                    recentAnswers: textAnswers.slice(0, 15),
                    count: totalResponses,
                    answeredCount,
                    validRate,
                    spamCount
                };
            }

            return {
                questionId: question.id,
                questionText: question.question_text,
                questionType: questionType,
                order: question.display_order,
                stats,
                skipRate,
                isHighSkipRate
            };
        });

        return analysis;
    }

    /**
     * Get Drop-Off Analysis
     */
    async getDropOffAnalysis(surveyId, filters = null) {
        let responseIds = null;
        if (filters) {
            responseIds = await analyticsRepository.getResponseIdsByFilter(surveyId, filters);
        }

        const questions = await analyticsRepository.getSurveyQuestions(surveyId);
        const responses = await analyticsRepository.getSurveyResponses(surveyId, responseIds);

        const sortedQuestions = questions.sort((a, b) => a.display_order - b.display_order);
        const dropOffStats = [];

        // Add "Start" step
        const totalSessions = responses.length;
        // Step 0: Sessions Started
        // For questions, we track who answered them.

        sortedQuestions.forEach((question, index) => {
            // Reached Count:
            // - For Q1: Everyone who started (roughly) OR strictly those who answered Q1?
            // - Standard: Reached = Answered THIS question OR any SUBSEQUENT question.

            const reachedCount = responses.filter(r => {
                if (!r.Answers) return false;
                // Check if answered this question
                const answeredThis = r.Answers.some(a => a.question_id === question.id);
                if (answeredThis) return true;

                // OR answered any later question
                const answeredLater = r.Answers.some(a => {
                    // Find question for answer
                    const qRaw = sortedQuestions.find(sq => sq.id === a.question_id);
                    return qRaw && qRaw.display_order > question.display_order;
                });
                return answeredLater;
            }).length;

            // Dropped Off Count (at this step):
            // - Reached this question BUT did not reach the next one (and is not completed).
            // - Or simpler: Last answer was THIS question AND status != completed.

            const droppedOffCount = responses.filter(r => {
                if (r.status === 'completed') return false;
                if (!r.Answers || r.Answers.length === 0) return false;

                // Find the max order question answered
                let maxOrder = -1;
                r.Answers.forEach(a => {
                    const qRaw = sortedQuestions.find(sq => sq.id === a.question_id);
                    if (qRaw && qRaw.display_order > maxOrder) maxOrder = qRaw.display_order;
                });

                return maxOrder === question.display_order;
            }).length;

            const dropOffRate = reachedCount > 0
                ? ((droppedOffCount / reachedCount) * 100).toFixed(1)
                : 0;

            dropOffStats.push({
                questionId: question.id,
                questionText: question.question_text,
                order: question.display_order,
                reachedCount,
                droppedOffCount,
                dropOffRate
            });
            console.log(`[DropOff Analysis] Q${index + 1} (${question.question_text}): Reached=${reachedCount}, Dropped=${droppedOffCount}, Rate=${dropOffRate}%`);
        });

        // Add explicit "Survey Start" step if we have empty sessions that didn't answer Q1
        const interactedCount = responses.filter(r => r.Answers && r.Answers.length > 0).length;
        const bouncedCount = totalSessions - interactedCount;

        if (bouncedCount > 0) {
            dropOffStats.unshift({
                questionId: 'start',
                questionText: 'Survey Start (Bounce)',
                order: 0,
                reachedCount: totalSessions,
                droppedOffCount: bouncedCount,
                dropOffRate: ((bouncedCount / totalSessions) * 100).toFixed(1)
            });
        }

        // Sort by highest drop-off rate to find hotspots (excluding start maybe?)
        const hotspots = [...dropOffStats]
            .filter(s => s.questionId !== 'start')
            .sort((a, b) => parseFloat(b.dropOffRate) - parseFloat(a.dropOffRate))
            .slice(0, 3);

        return {
            steps: dropOffStats,
            hotspots
        };
    }

    /**
     * Get Segments (Filter Options)
     */
    async getSegments(surveyId) {
        const questions = await analyticsRepository.getSurveyQuestions(surveyId);

        // Identity Segments
        const identitySegments = [
            { label: 'Registered Users', value: 'user', type: 'identity' },
            { label: 'Anonymous', value: 'anonymous', type: 'identity' },
            { label: 'Email Only', value: 'email', type: 'identity' }
        ];

        // Question Segments (Only Choice questions for now)
        const questionSegments = questions
            .filter(q => q.QuestionType && (q.QuestionType.type_name === 'single_choice' || q.QuestionType.type_name === 'multi_choice'))
            .map(q => ({
                id: q.id,
                label: q.question_text,
                options: (q.QuestionOptions || []).map(opt => ({
                    id: opt.id,
                    label: opt.option_text
                }))
            }));

        return {
            identity: identitySegments,
            questions: questionSegments
        };
    }

    /**
     * Get Segment Analysis (Cross-tab)
     */
    async getSegmentAnalysis(surveyId, groupBy = 'domain', filterQuestionId = null, filterOptionId = null) {
        let responseIds = null;

        // 1. If filtering by a specific question/answer (Cross-tab)
        if (filterQuestionId && filterOptionId) {
            responseIds = await analyticsRepository.getResponsesByQuestionFilter(surveyId, filterQuestionId, filterOptionId);

            // If no responses match the filter, return empty result early
            if (responseIds.length === 0) {
                return [];
            }
        }

        // 2. Fetch responses (optionally filtered)
        const responses = await analyticsRepository.getSurveyResponses(surveyId, responseIds);

        // 3. Group responses
        const segments = {};

        responses.forEach(r => {
            let segmentKey = 'Unknown';

            if (groupBy === 'domain') {
                let email = null;
                if (r.User && r.User.email) {
                    email = r.User.email;
                } else if (r.respondent_email) {
                    email = r.respondent_email;
                }

                if (email && email.includes('@')) {
                    const parts = email.split('@');
                    const domain = parts[parts.length - 1];
                    segmentKey = domain || 'Unknown';
                }
            } else if (groupBy === 'status') {
                segmentKey = r.status;
            } else if (groupBy === 'question' && filterQuestionId) {
                // If grouping by the filtered question itself (to see distribution)
                // This logic might need expansion if we want to group by a DIFFERENT question than the filter
                // For now, let's stick to domain/status as primary segments, 
                // and the filter just narrows down the dataset.
            }

            if (!segments[segmentKey]) {
                segments[segmentKey] = {
                    count: 0,
                    responses: []
                };
            }

            segments[segmentKey].count++;
            segments[segmentKey].responses.push(r);
        });

        // 4. Calculate basic stats per segment
        const segmentStats = Object.entries(segments).map(([key, data]) => {
            const completed = data.responses.filter(r => r.status === 'completed').length;
            const rate = data.count > 0 ? (completed / data.count) * 100 : 0;

            return {
                segment: key,
                totalResponses: data.count,
                completionRate: rate.toFixed(1),
                // Add more stats here if needed for cross-tab comparison
                // e.g. Average satisfaction for this segment
            };
        });

        return segmentStats;
    }

    /**
     * Generate AI Insights using Gemini
     */
    // Simple In-Memory Cache (Production should use Redis or DB)
    _aiCache = new Map();

    /**
     * Generate AI Insights using Gemini
     */
    async getAiInsights(surveyId, userId = null, io = null) {
        try {
            // 1. Check Cache
            const cacheKey = `insights_${surveyId}`;
            const cached = this._aiCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1 hour TTL
                console.log(`[AnalyticsService] Serving cached insights for ${surveyId}`);
                return cached.data;
            }

            console.log(`[AnalyticsService] getAiInsights called for surveyId: ${surveyId}`);
            // 2. Gather data to send to LLM
            const overview = await this.getOverview(surveyId);
            const questionAnalysis = await this.getQuestionAnalysis(surveyId);

            // Prepare a summary string for the LLM
            let dataSummary = `Survey Analysis Data:\n`;
            dataSummary += `Total Responses: ${overview.totalResponses}\n`;
            dataSummary += `Completion Rate: ${overview.completionRate}%\n\n`;

            dataSummary += `Questions Analysis:\n`;
            questionAnalysis.forEach((q, index) => {
                dataSummary += `Q${index + 1}: ${q.questionText} (${q.questionType})\n`;
                if (q.stats.type === 'choice') {
                    dataSummary += `Results: ${JSON.stringify(q.stats.counts)}\n`;
                } else if (q.stats.type === 'numeric') {
                    dataSummary += `Average: ${q.stats.average} (Min: ${q.stats.min}, Max: ${q.stats.max})\n`;
                } else if (q.stats.type === 'text') {
                    dataSummary += `Sample Answers: ${JSON.stringify(q.stats.recentAnswers.slice(0, 3))}\n`;
                }
                dataSummary += `\n`;
            });

            // 3. Call Gemini Service
            try {
                const insights = await geminiService.generateInsights(dataSummary);

                if (insights) {
                    // POST-PROCESSING: Inject Skip Rate Warnings
                    questionAnalysis.forEach(q => {
                        if (q.isHighSkipRate) {
                            const warning = `High Skip Rate detected on Q${q.order} (${q.skipRate}%). Consider forcing a response or rewording the question.`;
                            if (insights.recommended_actions) {
                                insights.recommended_actions.push(warning);
                            } else {
                                insights.recommended_actions = [warning];
                            }
                        }
                    });

                    // Save to Cache
                    this._aiCache.set(cacheKey, {
                        data: insights,
                        timestamp: Date.now()
                    });
                    if (userId) {
                        try {
                            const survey = await SurveyModel.findByPk(surveyId, { attributes: ['id', 'workspace_id', 'title'] });
                            if (survey && survey.workspace_id) {
                                await activityService.logActivity({
                                    workspaceId: survey.workspace_id,
                                    userId: userId,
                                    action: 'analysis_finished',
                                    targetType: 'survey',
                                    targetId: surveyId,
                                    metadata: { title: survey.title },
                                    io
                                });
                            }
                        } catch (activityError) {
                            logger.error('[AnalyticsService] Failed to log activity:', activityError.message);
                        }
                    }
                    return insights;
                } else {
                    return this._getFallbackInsights(overview);
                }
            } catch (error) {
                console.error('Gemini Insight Generation Failed:', error.message);
                return this._getFallbackInsights(overview, error.message);
            }
        } catch (error) {
            console.error('[AnalyticsService] getAiInsights ERROR:', error);
            throw error;
        }
    }

    _getFallbackInsights(overview, errorMsg = null) {
        return {
            status: 'unavailable',
            reason: errorMsg || "AI Service Unavailable",
            summary: `Survey has collected ${overview.totalResponses} responses with a completion rate of ${overview.completionRate}%.`,
            key_findings: [
                "Completion rate is " + (overview.completionRate > 50 ? "healthy" : "low"),
                "Average time taken is " + (overview.avgTimeSeconds ? overview.avgTimeSeconds + " seconds" : "not available")
            ],
            respondents_needs: ["Unable to analyze specific needs without AI connection."],
            recommended_actions: ["Check survey distribution channels", "Review question clarity"]
        };
    }

    async getFeedbackSummary(surveyId) {
        const feedbackService = require('../../surveys/service/feedback.service');
        return await feedbackService.getFeedbackStats(surveyId);
    }

    async chatWithData(surveyId, messages, provider = 'gemini') {
        try {
            // 1. Gather all relevant analytics data
            // OPTIMIZATION: Check if context is needed (e.g. valid messages exist)

            const [overview, qualityScore, questions] = await Promise.all([
                this.getOverview(surveyId),
                require('./quality.service').calculateQualityScore(surveyId),
                this.getQuestionAnalysis(surveyId)
            ]);

            // 2. Simplify data for context (reduce token usage)
            const context = {
                overview: {
                    total_responses: overview.totalResponses,
                    completion_rate: overview.completionRate,
                    avg_time: overview.avgTimeSeconds,
                    drop_off_rate: overview.dropOffResponses
                },
                quality_score: {
                    total: qualityScore.totalScore,
                    factors: qualityScore.factors
                },
                questions: questions.map(q => ({
                    id: q.questionId,
                    text: q.questionText,
                    type: q.questionType,
                    // Truncate stats for context window optimization
                    stats: q.stats.type === 'text'
                        ? {
                            ...q.stats,
                            recentAnswers: q.stats.recentAnswers ? q.stats.recentAnswers.slice(0, 5).map(a => a.length > 100 ? a.substring(0, 100) + '...' : a) : []
                        }
                        : q.stats
                }))
            };

            // 3. Call LLM Provider
            // Normalize messages if needed (handled by provider service)

            if (provider === 'groq') {
                const groqService = require('../../llm/service/groq.service');
                return await groqService.chat(messages, context);
            } else {
                return await geminiService.chat(messages, context);
            }

        } catch (error) {
            console.error('Error in chatWithData:', error);
            throw error;
        }
    }

    async prepareDataForAi(surveyId) {
        const overview = await this.getOverview(surveyId);
        const questions = await this.getQuestionAnalysis(surveyId);

        return JSON.stringify({
            overview,
            questions: questions.map(q => ({
                text: q.questionText,
                type: q.questionType,
                stats: q.stats
            }))
        });
    }
    /**
     * Get Admin Dashboard
     */
    async getAdminDashboard() {
        const rawData = await analyticsRepository.getAdminDashboardData();

        // Format Role Stats
        const roleStats = {};
        rawData.roleStats.forEach(stat => {
            roleStats[stat.role] = parseInt(stat.get('count'));
        });

        // Format Responses Per Survey
        const responsesPerSurvey = {
            labels: rawData.responsesPerSurvey.map(s => s.title),
            data: rawData.responsesPerSurvey.map(s => parseInt(s.get('responseCount')))
        };

        // Format Survey Activity
        const surveyActivity = {
            labels: [],
            data: []
        };

        // Fill in missing days for the last 7 days
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];

            const found = rawData.surveyActivity.find(a => a.get('date') === dateStr);
            surveyActivity.labels.push(dateStr);
            surveyActivity.data.push(found ? parseInt(found.get('count')) : 0);
        }

        return {
            totals: rawData.totals,
            roleStats,
            responsesPerSurvey,
            surveyActivity
        };
    }
    /**
     * Get Creator Dashboard
     */
    async getCreatorDashboard(userId) {
        const stats = await analyticsRepository.getCreatorDashboardData(userId);
        return stats;
    }
}

module.exports = new AnalyticsService();
