
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const qualityService = require('../src/modules/analytics/service/quality.service');
const { Survey, SurveyResponse } = require('../src/models');

async function verifyQualityScore() {
    console.log('🔍 Starting Quality Score Verification...');

    try {
        // 1. Get a seeded survey (One with responses)
        const survey = await Survey.findOne({
            order: [['created_at', 'DESC']],
            include: [SurveyResponse]
        });

        if (!survey) {
            console.error('No survey found. Run seeding script first.');
            process.exit(1);
        }

        console.log(`Analyzing Survey: "${survey.title}" (ID: ${survey.id})`);
        console.log(`Response Count: ${survey.SurveyResponses.length}`);

        // 2. Calculate Score
        console.log('\n--- Calculating Quality Score ---');
        const start = Date.now();
        const result = await qualityService.calculateQualityScore(survey.id);
        const duration = Date.now() - start;

        // 3. Output Results
        console.log(`\n🏆 Total Quality Score: ${result.totalScore} / 100`);
        console.log(`⏱️ Calculation Time: ${duration}ms`);

        console.log('\n--- Factor Breakdown ---');
        console.log(`(A) Completion Rate: ${result.factors.completion.score}/15 (Rate: ${result.factors.completion.details.rate})`);
        console.log(`(B) Time Behavior:   ${result.factors.time.score}/15 (Avg: ${result.factors.time.details.avgTime})`);

        // Handle varied detail structure for C (some might be mock)
        const cScore = result.factors.design.score;
        console.log(`(C) Design Quality:  ${cScore}/20`);

        console.log(`(D) Text Quality:    ${result.factors.textQuality.score}/15 (Valid: ${result.factors.textQuality.details.validRate})`);
        console.log(`(E) AI Effectiveness:${result.factors.aiEffectiveness.score}/15 (AI Qs: ${result.factors.aiEffectiveness.details.aiCount})`);
        console.log(`(F) User Feedback:   ${result.factors.userFeedback.score}/20 (Avg Rating: ${result.factors.userFeedback.details.avgRating})`);

        console.log('\n--- Warnings ---');
        if (result.warnings.length > 0) {
            result.warnings.forEach(w => console.log(`⚠️  ${w}`));
        } else {
            console.log('No warnings found.');
        }

        // 4. Assertions
        if (result.totalScore < 0 || result.totalScore > 100) {
            throw new Error('Score out of range (0-100)');
        }

        console.log('\n✅ Quality Score Verification Complete!');
        process.exit(0);

    } catch (error) {
        console.error('Verification Failed:', error);
        process.exit(1);
    }
}

verifyQualityScore();
