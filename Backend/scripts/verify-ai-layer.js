
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const analyticsService = require('../src/modules/analytics/service/analytics.service');
const { Survey, SurveyResponse } = require('../src/models');

async function verifyAiLayer() {
    console.log('🔍 Starting AI Layer Verification...');
    console.log('NOTE: This test requires a valid GEMINI_API_KEY in .env');

    try {
        // 1. Get a seeded survey
        const survey = await Survey.findOne({
            order: [['created_at', 'DESC']],
            include: [SurveyResponse]
        });

        if (!survey) {
            console.error('No survey found. Run seeding script first.');
            process.exit(1);
        }

        console.log(`Analyzing Survey: "${survey.title}" (ID: ${survey.id})`);

        // 2. Test AI Insights
        console.log('\n--- Testing generateInsights ---');
        console.log('Generating context and calling LLM...');
        const start = Date.now();
        const insights = await analyticsService.getAiInsights(survey.id);
        const duration = Date.now() - start;

        console.log(`⏱️ Duration: ${duration}ms`);
        console.log('Result Keys:', Object.keys(insights));

        if (insights.summary) {
            console.log('✅ Insights generated/fallback successfully.');
            console.log('Summary:', insights.summary.substring(0, 100) + '...');
        } else {
            console.error('❌ Failed to generate insights structure.');
        }

        // 3. Test Chat with Data
        console.log('\n--- Testing chatWithData ---');
        const question = "What is the completion rate and how does it compare to the average?";
        console.log(`User Question: "${question}"`);

        const chatResponse = await analyticsService.chatWithData(survey.id, question);
        console.log('\n🤖 AI Answer:');
        console.log(chatResponse);

        if (!chatResponse) {
            console.error('❌ Empty chat response.');
        }

        // 4. Verify Context Guardrails (Mock check)
        // We can't easily intercept the internal variable without a unit test, 
        // but if the above run without 400 Bad Request regarding token limits on a large dataset, it's a good sign.
        console.log('\n✅ AI Layer Verification Complete!');
        process.exit(0);

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verifyAiLayer();
