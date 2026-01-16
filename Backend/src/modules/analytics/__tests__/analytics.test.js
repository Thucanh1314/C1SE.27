const request = require('supertest');
const app = require('../../../app');
const { User, Survey, SurveyTemplate, SurveyResponse, sequelize } = require('../../../models');
const jwt = require('jsonwebtoken');

describe('Analytics Module', () => {
    let adminToken, creatorToken;
    let adminId, creatorId;
    let templateId, surveyId;
    const uniqueSuffix = Date.now().toString();

    beforeAll(async () => {
        // Users
        const admin = await User.create({
            username: 'admin_Analy' + uniqueSuffix,
            email: `admin_Analy_${uniqueSuffix}@example.com`,
            password: 'hash',
            full_name: 'Admin Analy',
            role: 'admin'
        });
        adminId = admin.id;

        const creator = await User.create({
            username: 'creator_Analy' + uniqueSuffix,
            email: `creator_Analy_${uniqueSuffix}@example.com`,
            password: 'hash',
            full_name: 'Creator Analy',
            role: 'creator'
        });
        creatorId = creator.id;

        // Template & Survey
        const template = await SurveyTemplate.create({
            title: 'Analy Template',
            created_by: creatorId,
            status: 'active'
        });
        templateId = template.id;

        const survey = await Survey.create({
            template_id: templateId,
            title: 'Analy Survey',
            created_by: creatorId,
            status: 'active',
            start_date: new Date(),
            end_date: new Date(Date.now() + 86400000),
            access_type: 'public'
        });
        surveyId = survey.id;

        // Add one response
        await SurveyResponse.create({
            survey_id: surveyId,
            status: 'completed',
            is_anonymous: true,
            completion_time: new Date()
        });

        // Tokens
        const secret = process.env.JWT_SECRET || 'llm_survey_secret_2024';
        adminToken = jwt.sign({ id: adminId, role: 'admin' }, secret, { expiresIn: '1h' });
        creatorToken = jwt.sign({ id: creatorId, role: 'creator' }, secret, { expiresIn: '1h' });
    });

    afterAll(async () => {
        try {
            await SurveyResponse.destroy({ where: { survey_id: surveyId } });
            await Survey.destroy({ where: { id: surveyId } });
            await SurveyTemplate.destroy({ where: { id: templateId } });
            await User.destroy({ where: { id: [adminId, creatorId] } });
        } catch (e) { console.error('Cleanup failed', e); }
    });

    describe('GET /api/modules/analytics/survey/:id/overview', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .get(`/api/modules/analytics/survey/${surveyId}/overview`);
            expect(res.statusCode).toEqual(401);
        });

        it('should return overview for authenticated user', async () => {
            const res = await request(app)
                .get(`/api/modules/analytics/survey/${surveyId}/overview`)
                .set('Authorization', `Bearer ${creatorToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.totalResponses).toBeGreaterThan(0);
        });
    });

    describe('GET /api/modules/analytics/admin/dashboard', () => {
        it('should deny non-admin', async () => {
            const res = await request(app)
                .get('/api/modules/analytics/admin/dashboard')
                .set('Authorization', `Bearer ${creatorToken}`);
            expect(res.statusCode).toEqual(403);
        });

        it('should allow admin', async () => {
            const res = await request(app)
                .get('/api/modules/analytics/admin/dashboard')
                .set('Authorization', `Bearer ${adminToken}`);
            if (res.statusCode !== 200) {
                require('fs').writeFileSync('analytics_error.json', JSON.stringify({ status: res.statusCode, body: res.body }, null, 2));
            }
            expect(res.statusCode).toEqual(200);
        });
    });
});
