const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const sequelize = require('../src/config/database');
const { DataTypes } = require('sequelize');

async function runMigration() {
    try {
        console.log('Starting manual migration...');
        const queryInterface = sequelize.getQueryInterface();

        await queryInterface.createTable('creator_upgrade_requests', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false
            },
            user_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            reason: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            intended_usage: {
                type: DataTypes.ENUM('academic', 'business', 'personal', 'other'),
                defaultValue: 'other'
            },
            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected'),
                defaultValue: 'pending'
            },
            admin_comment: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            reviewed_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            reviewed_at: {
                type: DataTypes.DATE,
                allowNull: true
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        console.log('Migration successful: creator_upgrade_requests table created.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
