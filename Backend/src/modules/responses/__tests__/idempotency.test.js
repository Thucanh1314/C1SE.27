const request = require('supertest');
const app = require('../../../app'); // Adjust path to your Express app
const { Survey, SurveyResponse } = require('../../../models');

describe('Response Idempotency Integration Test', () => {
    let surveyId;
    let collectorToken = 'TEST_TOKEN_123';
    let clientResponseId = 'test-client-uuid-v4';

    let userId;

    beforeAll(async () => {
        try {
            console.log('STARTING SETUP...');
            // Create User first
            const { User } = require('../../../models');
            const user = await User.create({
                username: 'test_idempotency_' + Date.now(),
                email: `test_idempotency_${Date.now()}@example.com`,
                password: 'password123',
                full_name: 'Test Idempotency User', // Required field
                role: 'user'
            });
            userId = user.id;
            console.log('User created:', userId);

            // Create Template first
            const { SurveyTemplate } = require('../../../models');
            const template = await SurveyTemplate.create({
                title: 'Idempotency Template',
                created_by: userId,
                status: 'active'
            });
            console.log('Template created:', template.id);

            // Create a test survey
            const survey = await Survey.create({
                title: 'Idempotency Test Survey',
                status: 'active',
                created_by: userId,
                access_type: 'public',
                template_id: template.id,
                start_date: new Date(),
                end_date: new Date(new Date().setDate(new Date().getDate() + 7))
            });
            surveyId = survey.id;
            console.log('Survey created:', surveyId);

            // Mock collector
            const { SurveyCollector } = require('../../../models');
            await SurveyCollector.create({
                survey_id: surveyId,
                token: collectorToken,
                type: 'web_link',
                is_active: true
            });
            console.log('Collector created');
        } catch (error) {
            console.error('SETUP ERROR:', JSON.stringify(error, null, 2));
        }
    });

    afterAll(async () => {
        // Cleanup
        const { User } = require('../../../models');
        const { SurveyCollector } = require('../../../models');
        const { SurveyTemplate } = require('../../../models');
        if (surveyId) {
            await SurveyResponse.destroy({ where: { survey_id: surveyId } });
            await SurveyCollector.destroy({ where: { survey_id: surveyId } });
            await Survey.destroy({ where: { id: surveyId } });
            await SurveyTemplate.destroy({ where: { title: 'Idempotency Template' } });
        }
        if (userId) await User.destroy({ where: { id: userId } });
    });

    test('Should create ONLY ONE response for multiple submissions with same client_response_id', async () => {
        const payload = {
            client_response_id: clientResponseId,
            answers: [
                { questionId: 1, value: "Test Answer" } // Mock answer
            ]
        };

        // 1. First Submit
        const res1 = await request(app)
            .post(`/api/modules/responses/public/${collectorToken}/submit`)
            .send(payload);

        console.log('RES1:', res1.status, JSON.stringify(res1.body));

        expect(res1.status).toBe(201);
        expect(res1.body.success).toBe(true);
        const responseId1 = res1.body.data.response_id;

        // 2. Second Submit (Same ID)
        const res2 = await request(app)
            .post(`/api/modules/responses/public/${collectorToken}/submit`)
            .send(payload);

        console.log('RES2:', res2.status, JSON.stringify(res2.body));

        expect(res2.status).toBe(201); // Should still succeed
        expect(res2.body.success).toBe(true);
        const responseId2 = res2.body.data.response_id;

        // 3. Verify IDs match
        console.log(`ID1: ${responseId1}, ID2: ${responseId2}`);
        expect(responseId1).toBe(responseId2);

        // 4. Verify DB count
        const count = await SurveyResponse.count({
            where: { survey_id: surveyId }
        });
        expect(count).toBe(1);
    });
});
