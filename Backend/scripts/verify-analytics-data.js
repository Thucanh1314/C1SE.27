const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const analyticsService = require('../src/modules/analytics/service/analytics.service');
const { Survey, SurveyResponse } = require('../src/models');
const sequelize = require('../src/config/database');

async function verify() {
    console.log('🔍 Verifying Analytics Data...');
    try {
        await sequelize.authenticate();

        // Find a survey seeded by our script
        const survey = await Survey.findOne({ where: { title: 'IT Satisfaction Survey' } });

        if (!survey) {
            console.error('❌ Survey not found! Did you run the Seeding Script?');
            process.exit(1);
        }

        console.log(`\nAnalyzing Survey: ${survey.title} (ID: ${survey.id})`);

        // 1. Overview
        console.log('\n--- 1. OVERVIEW ---');
        const overview = await analyticsService.getOverview(survey.id);
        console.log(JSON.stringify(overview, null, 2));

        if (overview.totalResponses === 0) console.warn('⚠️ Warning: No responses found');

        // 2. Question Analytics
        console.log('\n--- 2. QUESTION ANALYTICS ---');
        const questions = await analyticsService.getQuestionAnalysis(survey.id);
        questions.forEach(q => {
            console.log(`[Q${q.order}] ${q.questionText} (${q.questionType})`);
            console.log(`   Stats:`, JSON.stringify(q.stats));

            if (q.stats.type === 'choice') {
                if (!q.stats.optionPercents) console.error('   ❌ Missing optionPercents');
            }
        });

        // 3. Drop-off Analysis
        console.log('\n--- 3. DROP-OFF ANALYSIS ---');
        const dropOff = await analyticsService.getDropOffAnalysis(survey.id);
        console.log('Steps:');
        dropOff.steps.forEach(s => {
            console.log(`   [Q${s.order}] Reached: ${s.reachedCount}, DropOff: ${s.droppedOffCount} (${s.dropOffRate}%)`);
        });
        console.log('Hotspots:', JSON.stringify(dropOff.hotspots, null, 2));

        console.log('\n✅ Verification Complete');
        process.exit(0);

    } catch (error) {
        console.error('Verification Failed:', error);
        const fs = require('fs');
        fs.writeFileSync('verify_error.txt', error.stack || String(error));
        process.exit(1);
    }
}

verify();
