'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add new columns to notifications table
        await queryInterface.addColumn('notifications', 'related_survey_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'surveys',
                key: 'id'
            },
            onDelete: 'CASCADE'
        });

        await queryInterface.addColumn('notifications', 'related_workspace_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'workspaces',
                key: 'id'
            },
            onDelete: 'CASCADE'
        });

        await queryInterface.addColumn('notifications', 'related_response_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        await queryInterface.addColumn('notifications', 'related_user_id', {
            type: Sequelize.INTEGER,
            allowNull: true
        });

        await queryInterface.addColumn('notifications', 'action_url', {
            type: Sequelize.STRING(500),
            allowNull: true
        });

        await queryInterface.addColumn('notifications', 'actor_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'SET NULL'
        });

        await queryInterface.addColumn('notifications', 'actor_name', {
            type: Sequelize.STRING,
            allowNull: true
        });

        await queryInterface.addColumn('notifications', 'actor_avatar', {
            type: Sequelize.STRING(500),
            allowNull: true
        });

        await queryInterface.addColumn('notifications', 'is_archived', {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        });

        await queryInterface.addColumn('notifications', 'priority', {
            type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
            defaultValue: 'normal'
        });

        await queryInterface.addColumn('notifications', 'category', {
            type: Sequelize.STRING(50),
            allowNull: true
        });

        await queryInterface.addColumn('notifications', 'metadata', {
            type: Sequelize.JSON,
            allowNull: true
        });

        // Add indexes
        await queryInterface.addIndex('notifications', ['user_id', 'is_read', 'created_at'], {
            name: 'idx_user_unread'
        });

        await queryInterface.addIndex('notifications', ['user_id', 'category'], {
            name: 'idx_user_category'
        });

        await queryInterface.addIndex('notifications', ['created_at'], {
            name: 'idx_created_at'
        });

        // Update type enum to include new types
        await queryInterface.changeColumn('notifications', 'type', {
            type: Sequelize.ENUM(
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
                'deadline_reminder'
            ),
            allowNull: false
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Remove indexes
        await queryInterface.removeIndex('notifications', 'idx_user_unread');
        await queryInterface.removeIndex('notifications', 'idx_user_category');
        await queryInterface.removeIndex('notifications', 'idx_created_at');

        // Remove columns
        await queryInterface.removeColumn('notifications', 'related_survey_id');
        await queryInterface.removeColumn('notifications', 'related_workspace_id');
        await queryInterface.removeColumn('notifications', 'related_response_id');
        await queryInterface.removeColumn('notifications', 'related_user_id');
        await queryInterface.removeColumn('notifications', 'action_url');
        await queryInterface.removeColumn('notifications', 'actor_id');
        await queryInterface.removeColumn('notifications', 'actor_name');
        await queryInterface.removeColumn('notifications', 'actor_avatar');
        await queryInterface.removeColumn('notifications', 'is_archived');
        await queryInterface.removeColumn('notifications', 'priority');
        await queryInterface.removeColumn('notifications', 'category');
        await queryInterface.removeColumn('notifications', 'metadata');
    }
};
