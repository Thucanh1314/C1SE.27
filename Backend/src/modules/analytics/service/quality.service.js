const { Survey, SurveyResponse, Answer, Question, QuestionOption, SurveyTemplate, SurveyFeedback } = require('../../../models');
const geminiService = require('../../llm/service/gemini.service');
const { Op } = require('sequelize');

// Simple in-memory cache for design scores to prevent fluctuation
const designScoreCache = new Map();

class QualityService {

    /**
     * Main method to calculate the total Quality Score (0-100)
     */
    async calculateQualityScore(surveyId) {
        try {
            // Fetch survey data once
            const survey = await Survey.findByPk(surveyId, {
                include: [
                    {
                        model: SurveyResponse,
                        attributes: ['id', 'status', 'time_taken', 'created_at', 'updated_at', 'completion_time']
                    },
                    {
                        model: SurveyTemplate,
                        as: 'template',
                        include: [{
                            model: Question,
                            as: 'Questions',
                            include: [{ model: QuestionOption, as: 'QuestionOptions' }]
                        }]
                    }
                ]
            });

            if (!survey) throw new Error('Survey not found');

            const responses = survey.SurveyResponses || [];
            const questions = survey.template?.Questions || [];

            // Calculate 5 Factors (Total 100)
            const factorA = this._evaluateCompletion(responses); // Max 20
            const factorB = this._evaluateTime(responses, questions.length); // Max 20
            const factorC = await this._evaluateDesign(surveyId, questions); // Max 20
            const factorD = await this._evaluateTextAnswers(surveyId); // Max 20
            const factorE = await this._evaluateUserFeedback(surveyId); // Max 20

            const totalScore = Math.round(factorA.score + factorB.score + factorC.score + factorD.score + factorE.score);

            return {
                totalScore,
                factors: {
                    completion: factorA,
                    time: factorB,
                    design: factorC,
                    textQuality: factorD,
                    userFeedback: factorE
                },
                warnings: [
                    ...factorA.warnings,
                    ...factorB.warnings,
                    ...factorC.warnings,
                    ...factorD.warnings,
                    ...factorE.warnings
                ]
            };

        } catch (error) {
            console.error('[QualityService] Error:', error);
            throw error;
        }
    }

    // (A) Completion Behavior (0-20)
    _evaluateCompletion(responses) {
        const total = responses.length;
        if (total === 0) return { score: 0, warnings: ['No data for completion analysis'] };

        const completed = responses.filter(r => r.status === 'completed').length;
        const rate = completed / total;

        // Score: Rate * 20 (Max 20)
        let score = Math.round(rate * 20);
        const warnings = [];
        if (rate < 0.5) warnings.push('Low completion rate (< 50%)');

        return { score, details: { rate: (rate * 100).toFixed(1) + '%' }, warnings };
    }

    // (B) Time Behavior (0-20)
    _evaluateTime(responses, questionCount) {
        // Filter for completed responses
        const completed = responses.filter(r => r.status === 'completed');

        let validTimeCount = 0;
        let totalTime = 0;

        completed.forEach(r => {
            let time = r.time_taken;

            // Fallback calculation if time_taken is missing/0 but we have timestamps
            if (!time && r.completion_time && r.created_at) {
                const start = new Date(r.created_at).getTime();
                const end = new Date(r.completion_time).getTime();
                if (end > start) {
                    time = Math.floor((end - start) / 1000);
                }
            } else if (!time && r.updated_at && r.created_at) {
                // Fallback to updated_at if completion_time missing
                const start = new Date(r.created_at).getTime();
                const end = new Date(r.updated_at).getTime();
                if (end > start) {
                    time = Math.floor((end - start) / 1000);
                }
            }

            if (time > 0) {
                totalTime += time;
                validTimeCount++;
            }
        });

        if (validTimeCount === 0) return { score: 0, warnings: ['No timing data'] };

        const avgTime = totalTime / validTimeCount;
        const avgPerQuestion = questionCount > 0 ? avgTime / questionCount : 0;

        // Ideal: 10-60s per question? 
        // Too fast (< 5s/q) -> bad. Too slow (> 120s/q) -> bad.
        let score = 20; // Max 20
        const warnings = [];

        if (avgPerQuestion < 3) { // Lowered threshold slightly
            score -= 10;
            warnings.push('Respondents are answering too quickly (possible low quality)');
        } else if (avgPerQuestion > 180) { // Increased threshold
            score -= 5;
            warnings.push('Survey takes too long per question');
        }

        return { score: Math.max(0, score), details: { avgTime: Math.round(avgTime) + 's', avgPerQuestion: Math.round(avgPerQuestion) + 's' }, warnings };
    }

    // (C) Question Design Quality (0-20) - Uses Gemini with Caching
    async _evaluateDesign(surveyId, questions) {
        if (questions.length === 0) return { score: 20, warnings: [] };

        // Check cache
        const cacheKey = `${surveyId}_${questions.length}`;
        if (designScoreCache.has(cacheKey)) {
            return designScoreCache.get(cacheKey);
        }

        // Prepare prompt for Gemini
        const questionTexts = questions.map((q, i) => `Q${i + 1}: ${q.question_text}`).join('\n');
        const prompt = `Analyze these survey questions for design quality strict JSON format only.
        Rules:
        1. >150 chars = bad.
        2. Leading/Bias = bad.
        3. Clear = good.
        
        Return JSON: { "score": (integer 0-20), "issues": ["issue 1", "issue 2"] }
        
        Questions:
        ${questionTexts}`;

        try {
            const analysis = await geminiService.generateInsights(prompt);

            let result = { score: 18, warnings: [] }; // Default high score

            if (typeof analysis === 'object' && analysis.score !== undefined) {
                result = {
                    score: Math.min(20, Math.max(0, analysis.score)),
                    warnings: analysis.issues || []
                };
            } else if (typeof analysis === 'string') {
                // Try parsing JSON if string
                try {
                    // Extract JSON if wrapped in markdown code blocks
                    const cleanJson = analysis.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanJson);
                    if (parsed.score !== undefined) {
                        result = {
                            score: Math.min(20, Math.max(0, parsed.score)),
                            warnings: parsed.issues || []
                        };
                    }
                } catch (e) {
                    // Fallback heuristic if generic text
                    const longQuestions = questions.filter(q => q.question_text.length > 150);
                    let heuristicScore = 20 - (longQuestions.length * 2);
                    result = {
                        score: Math.max(0, heuristicScore),
                        warnings: longQuestions.length > 0 ? ['Some questions are too long'] : []
                    };
                }
            }

            // Cache the result
            designScoreCache.set(cacheKey, result);
            return result;

        } catch (e) {
            console.error('Gemini Design Analysis failed:', e);
            const fallback = { score: 15, warnings: ['AI Analysis unavailable'] };
            designScoreCache.set(cacheKey, fallback);
            return fallback;
        }
    }

    // (D) Text Answer Quality (0-20)
    async _evaluateTextAnswers(surveyId) {
        // Fetch text answers
        const answers = await Answer.findAll({
            include: [{
                model: SurveyResponse,
                where: { survey_id: surveyId }
            }],
            where: { text_answer: { [Op.ne]: null } }
        });

        if (answers.length === 0) return { score: 20, warnings: [] };

        const total = answers.length;
        const valid = answers.filter(a => {
            const t = a.text_answer.trim();
            if (t.length < 3) return false;
            // Simple spam check
            const unique = new Set(t.split('')).size;
            if (t.length > 5 && unique === 1) return false;
            return true;
        }).length;

        const validRate = valid / total;
        const score = Math.round(validRate * 20); // Max 20

        const warnings = [];
        if (validRate < 0.6) warnings.push('High rate of low-quality text answers');

        return { score, details: { validRate: (validRate * 100).toFixed(1) + '%' }, warnings };
    }

    // (E) User Feedback (0-20)
    async _evaluateUserFeedback(surveyId) {
        const feedbacks = await SurveyFeedback.findAll({
            where: {
                survey_id: surveyId,
                source: 'respondent'
            }
        });

        const totalRated = feedbacks.length;

        if (totalRated === 0) {
            return { score: 20, details: { avgRating: 'N/A' }, warnings: [] }; // Default full points if no negative feedback implies neutrality
        }

        const sumRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
        const avgRating = sumRating / totalRated;

        // Score: Avg Rating (5) * 4 = 20
        const score = Math.round(avgRating * 4);

        const warnings = [];
        if (avgRating < 3.0) warnings.push('User feedback is generally negative');

        const recentComments = await SurveyFeedback.findAll({
            where: {
                survey_id: surveyId,
                comment: { [Op.ne]: null, [Op.ne]: '' }
            },
            order: [['created_at', 'DESC']],
            limit: 5,
            attributes: ['id', 'rating', 'comment', 'created_at']
        });

        return {
            score,
            details: {
                avgRating: avgRating.toFixed(1),
                count: totalRated
            },
            comments: recentComments, // NEW: Return actual comments
            warnings
        };
    }
}

module.exports = new QualityService();
