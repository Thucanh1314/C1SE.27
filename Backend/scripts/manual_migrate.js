const { Sequelize } = require('sequelize');
const migration = require('../migrations/20251213010000-add-auth-provider-to-users');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: console.log
    }
);

async function runMigration() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const queryInterface = sequelize.getQueryInterface();

        console.log('Running migration...');
        await migration.up(queryInterface, Sequelize);
        console.log('Migration completed successfully!');

    } catch (err) {
        console.error('Migration failed:', err);
        // Special handling for duplicate column error
        if (err.message && err.message.includes('Duplicate column')) {
            console.log('Column already exists, ignoring.');
        }
    } finally {
        await sequelize.close();
    }
}

runMigration();
