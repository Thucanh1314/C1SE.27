require('dotenv').config();
const { sequelize, SurveyFeedback, Survey, SurveyResponse } = require('../src/models');

async function syncFeedbackTable() {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Connected.');

        console.log('🔄 Syncing SurveyFeedback model...');
        // Use alter: true to create table or update columns if exists
        await SurveyFeedback.sync({ alter: true });

        console.log('✅ SurveyFeedback table synced successfully.');

        // Verify it exists
        const [results] = await sequelize.query("SHOW TABLES LIKE 'survey_feedback'");
        if (results.length > 0) {
            console.log('✅ Verification: survey_feedback table exists.');
        } else {
            console.error('❌ Verification failed: Table not found after sync.');
        }

    } catch (error) {
        console.error('❌ Sync failed:', error);
    } finally {
        await sequelize.close();
    }
}

syncFeedbackTable();
