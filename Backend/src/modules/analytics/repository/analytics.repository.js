const { Survey, SurveyResponse, Answer, Question, QuestionOption, User } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../config/database'); // Adjust path if needed

class AnalyticsRepository {

    // Get Survey Details with Responses
    async getSurveyDetails(surveyId) {
        return await Survey.findByPk(surveyId, {
            include: [
                {
                    model: SurveyResponse,
                    attributes: ['id', 'status', 'time_taken', 'created_at', 'respondent_email'],
                    required: false, // Left join, but filter the ones we join
                    where: {
                        [Op.or]: [
                            { status: 'completed' },
                            sequelize.literal(`(SELECT COUNT(*) FROM answers WHERE answers.survey_response_id = SurveyResponses.id) > 0`)
                        ]
                    }
                },
                {
                    model: Question,
                    as: 'Questions',
                    attributes: ['id']
                }
            ]
        });
    }

    // Get Survey Questions
    async getSurveyQuestions(surveyId) {
        // First get the survey to find its template_id
        const survey = await Survey.findByPk(surveyId, { attributes: ['id', 'template_id'] });

        if (!survey || !survey.template_id) {
            // Fallback: try fetching by survey_id directly if no template structure (though schema says template_id is required)
            return await Question.findAll({
                where: { survey_id: surveyId },
                include: [
                    { model: QuestionOption, as: 'QuestionOptions' },
                    { model: require('../../../models').QuestionType, as: 'QuestionType' }
                ],
                order: [['display_order', 'ASC']]
            });
        }

        // Fetch questions for the template
        return await Question.findAll({
            where: { template_id: survey.template_id },
            include: [
                { model: QuestionOption, as: 'QuestionOptions' },
                { model: require('../../../models').QuestionType, as: 'QuestionType' }
            ],
            order: [['display_order', 'ASC']]
        });
    }

    // Get Survey Responses (full data with answers)
    async getSurveyResponses(surveyId, responseIds = null) {
        const whereClause = {
            survey_id: surveyId,
            [Op.or]: [
                { status: 'completed' },
                // Include partials only if they have answers (non-ghost)
                // Use association check instead of subquery for safety and performance where Answer is already included
                { '$Answers.id$': { [Op.ne]: null } }
            ]
        };
        if (responseIds) {
            whereClause.id = { ...whereClause.id, [Op.in]: responseIds };
        }

        return await SurveyResponse.findAll({
            where: whereClause,
            include: [
                {
                    model: Answer,
                    attributes: ['id', 'question_id', 'option_id', 'text_answer', 'numeric_answer']
                },
                {
                    model: User,
                    attributes: ['email']
                }
            ]
        });
    }

    // Get Responses Filtered by Question
    async getResponsesByQuestionFilter(surveyId, questionId, optionId) {
        // Find responses that have a specific answer
        const answers = await Answer.findAll({
            where: {
                question_id: questionId,
                option_id: optionId
            },
            include: [{
                model: SurveyResponse,
                where: { survey_id: surveyId },
                attributes: ['id']
            }]
        });

        return answers.map(a => a.SurveyResponse.id);
    }

    // Get Response IDs based on complex filters
    async getResponseIdsByFilter(surveyId, filters) {
        const whereClause = { survey_id: surveyId };

        // 1. Identity Filters
        if (filters.identityType) {
            if (filters.identityType === 'anonymous') {
                whereClause.is_anonymous = true;
            } else if (filters.identityType === 'user') {
                whereClause.respondent_id = { [Op.ne]: null };
            } else if (filters.identityType === 'email') {
                whereClause.respondent_email = { [Op.ne]: null };
                whereClause.respondent_id = null; // Only email, not registered user
            }
        }

        // 2. Base SurveyResponse Query
        let responseIds = null;
        const responses = await SurveyResponse.findAll({
            where: whereClause,
            attributes: ['id']
        });
        responseIds = responses.map(r => r.id);

        // 3. Question/Answer Cross-Tab Filter
        // If filtering by a specific answer (e.g., Q1 = Option A)
        if (filters.questionFilter && filters.questionFilter.questionId && filters.questionFilter.optionId) {
            const answerWhere = {
                question_id: filters.questionFilter.questionId,
                option_id: filters.questionFilter.optionId
            };

            // Find responses that HAVE this answer
            const matchingAnswers = await Answer.findAll({
                where: answerWhere,
                attributes: ['survey_response_id']
            });
            const matchingResponseIds = matchingAnswers.map(a => a.survey_response_id);

            // Intersect with existing IDs
            responseIds = responseIds.filter(id => matchingResponseIds.includes(id));
        }

        return responseIds;
    }

    // Get Admin Dashboard Data
    async getAdminDashboardData() {
        console.log('[AdminDashboard] Starting getAdminDashboardData...');

        // Use raw SQL queries to bypass any Sequelize issues
        const [totalUsersResult] = await sequelize.query('SELECT COUNT(*) as count FROM users');
        const [totalSurveysResult] = await sequelize.query('SELECT COUNT(*) as count FROM surveys');
        const [activeSurveysResult] = await sequelize.query('SELECT COUNT(*) as count FROM surveys WHERE status = "active"');
        const [totalResponsesResult] = await sequelize.query('SELECT COUNT(*) as count FROM survey_responses');

        const totals = {
            totalUsers: parseInt(totalUsersResult[0].count),
            totalSurveys: parseInt(totalSurveysResult[0].count),
            activeSurveys: parseInt(activeSurveysResult[0].count),
            totalResponses: parseInt(totalResponsesResult[0].count)
        };

        console.log('[AdminDashboard] Totals:', totals);

        const roleStats = await User.findAll({
            attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['role']
        });

        const responsesPerSurvey = await Survey.findAll({
            attributes: ['title', [sequelize.literal('(SELECT COUNT(*) FROM survey_responses WHERE survey_responses.survey_id = Survey.id)'), 'responseCount']],
            limit: 5,
            order: [[sequelize.literal('responseCount'), 'DESC']]
        });

        // Activity over last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const surveyActivity = await SurveyResponse.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                created_at: {
                    [Op.gte]: sevenDaysAgo
                }
            },
            group: [sequelize.fn('DATE', sequelize.col('created_at'))],
            order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']]
        });

        console.log('[AdminDashboard] Returning data...');
        return { totals, roleStats, responsesPerSurvey, surveyActivity };
    }

    // Get Creator Dashboard Data
    async getCreatorDashboardData(userId) {
        const totalSurveys = await Survey.count({ where: { created_by: userId } });
        const activeSurveys = await Survey.count({ where: { created_by: userId, status: 'active' } });
        const draftSurveys = await Survey.count({ where: { created_by: userId, status: 'draft' } });
        const closedSurveys = await Survey.count({ where: { created_by: userId, status: 'closed' } });

        return {
            totalSurveys,
            activeSurveys,
            draftSurveys,
            closedSurveys
        };
    }
}

module.exports = new AnalyticsRepository();
