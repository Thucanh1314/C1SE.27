// scripts/fix_all_enums.js
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

        // Fix Workspace Invitations Roles and Status
        console.log('Updating workspace_invitations ENUMs...');
        await connection.execute(`
            ALTER TABLE workspace_invitations 
            MODIFY COLUMN role ENUM('owner', 'collaborator', 'member', 'editor', 'viewer') DEFAULT 'member',
            MODIFY COLUMN status ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled') DEFAULT 'pending'
        `);

        // Fix Workspace Members Roles
        console.log('Updating workspace_members ENUMs...');
        await connection.execute(`
            ALTER TABLE workspace_members 
            MODIFY COLUMN role ENUM('owner', 'collaborator', 'member', 'editor', 'viewer') DEFAULT 'member'
        `);

        console.log('✅ All ENUMs updated successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

runMigration();
