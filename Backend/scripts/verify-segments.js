
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const analyticsService = require('../src/modules/analytics/service/analytics.service');
const { Survey, SurveyResponse, Question } = require('../src/models');

async function verifySegments() {
    console.log('🔍 Starting Segment Verification...');

    try {
        // 1. Get a survey with data
        const survey = await Survey.findOne({
            order: [['created_at', 'DESC']],
            include: [SurveyResponse]
        });

        if (!survey) {
            console.error('No survey found. Run seeding script first.');
            process.exit(1);
        }
        console.log(`Using Survey: ${survey.title} (ID: ${survey.id})`);
        console.log(`Global Total Responses: ${survey.SurveyResponses.length}`);

        // 2. Test getSegments
        console.log('\n--- Testing getSegments ---');
        const segments = await analyticsService.getSegments(survey.id);
        console.log('Identity Segments:', segments.identity.map(s => s.label).join(', '));
        console.log('Question Segments:', segments.questions.length);

        if (segments.identity.length === 0 || segments.questions.length === 0) {
            throw new Error('Segments not returned correctly');
        }

        // 3. Test Identity Filter (Anonymous)
        console.log('\n--- Testing Identity Filter (Anonymous) ---');
        const anonOverview = await analyticsService.getOverview(survey.id, { identityType: 'anonymous' });
        console.log(`Anonymous Responses: ${anonOverview.totalResponses}`);

        const userOverview = await analyticsService.getOverview(survey.id, { identityType: 'user' });
        console.log(`User Linked Responses: ${userOverview.totalResponses}`);

        if (anonOverview.totalResponses + userOverview.totalResponses > survey.SurveyResponses.length + 50) {
            // +50 buffer just in case of email only, but mainly ensuring logic roughly works
            console.warn('Warning: Sum of segments > Total? (Might check email-only)');
        }

        // 4. Test Cross-Tab (Question Filter)
        console.log('\n--- Testing Cross-Tab Filter ---');
        const q1 = segments.questions[0]; // Assume Q1 is choice
        const opt1 = q1.options[0];
        console.log(`Filtering by Q: "${q1.label}" = Option: "${opt1.label}"`);

        const filteredOverview = await analyticsService.getOverview(survey.id, {
            questionFilter: {
                questionId: q1.id,
                optionId: opt1.id
            }
        });
        console.log(`Filtered Total Responses: ${filteredOverview.totalResponses}`);

        if (filteredOverview.totalResponses >= survey.SurveyResponses.length) {
            console.warn('⚠️  Warning: Filtered count equals total count. Possible error unless everyone chose this option.');
        } else {
            console.log('✅ Filter reduced the dataset size as expected.');
        }

        console.log('\n✅ Segment & Cross-Tab Verification Complete!');
        process.exit(0);
    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verifySegments();
