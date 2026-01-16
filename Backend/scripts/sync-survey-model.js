require('dotenv').config();
const { sequelize, Survey } = require('../src/models');

async function syncSurveyModel() {
    try {
        console.log('🔄 Connecting to database...');
        await sequelize.authenticate();
        console.log('✅ Connected.');

        console.log('🔄 Syncing Survey model to update status ENUM...');
        // Use alter: true to update ENUM definition
        await Survey.sync({ alter: true });

        console.log('✅ Survey table synced successfully. Status ENUM should now include "archived".');

    } catch (error) {
        console.error('❌ Sync failed:', error);
    } finally {
        await sequelize.close();
    }
}

syncSurveyModel();
