require('dotenv').config();
const { sequelize } = require('../src/models');
const { DataTypes } = require('sequelize');

async function migrate() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected.');

        const queryInterface = sequelize.getQueryInterface();
        const tableDesc = await queryInterface.describeTable('users');

        if (!tableDesc.reset_password_token) {
            console.log('Adding reset_password_token column...');
            await queryInterface.addColumn('users', 'reset_password_token', {
                type: DataTypes.STRING,
                allowNull: true,
            });
            console.log('✅ reset_password_token added.');
        } else {
            console.log('ℹ️ reset_password_token already exists.');
        }

        if (!tableDesc.reset_password_expires) {
            console.log('Adding reset_password_expires column...');
            await queryInterface.addColumn('users', 'reset_password_expires', {
                type: DataTypes.DATE,
                allowNull: true,
            });
            console.log('✅ reset_password_expires added.');
        } else {
            console.log('ℹ️ reset_password_expires already exists.');
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
