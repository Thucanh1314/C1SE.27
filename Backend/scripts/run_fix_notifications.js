// scripts/run_fix_notifications.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    console.log('Attempting to connect to database...');

    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'allmtags_survey_db'
        });
        console.log('✅ Connected to database!');

        console.log('Updating notifications table type ENUM...');

        await connection.execute(`
            ALTER TABLE notifications 
            MODIFY COLUMN type ENUM(
              'survey_created',
              'survey_shared',
              'survey_response',
              'workspace_invite',
              'workspace_survey_added',
              'workspace_invitation',
              'workspace_member_added',
              'survey_invitation',
              'collector_created',
              'response_completed',
              'mention',
              'comment',
              'deadline_reminder',
              'role_change_request',
              'role_change_approved',
              'role_upgraded',
              'upgrade_rejected',
              'analysis_completed',
              'role_mismatch_alert',
              'system_alert'
            ) NOT NULL
        `);

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
