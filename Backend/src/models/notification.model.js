// src/models/notification.model.js
module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      type: {
        type: DataTypes.ENUM(
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
        ),
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      // Related entities (for smart routing)
      related_survey_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'surveys',
          key: 'id'
        }
      },
      related_workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'workspaces',
          key: 'id'
        }
      },
      related_response_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      related_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      // Legacy fields (keep for backward compatibility)
      related_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'workspace, survey, response, etc.'
      },
      related_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of the related object'
      },

      // Action URL (where to navigate on click)
      action_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },

      // Actor (who triggered this notification)
      actor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      actor_name: {
        type: DataTypes.STRING,
        allowNull: true
      },
      actor_avatar: {
        type: DataTypes.STRING(500),
        allowNull: true
      },

      // Status
      is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      is_archived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      read_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      // Metadata
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent', 'critical'),
        defaultValue: 'normal'
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'survey, workspace, system'
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },

      // Legacy data field
      data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional data for notification actions (e.g., token for invitations)'
      }
    },
    {
      tableName: 'notifications',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          name: 'idx_user_unread',
          fields: ['user_id', 'is_read', 'created_at']
        },
        {
          name: 'idx_user_category',
          fields: ['user_id', 'category']
        },
        {
          name: 'idx_created_at',
          fields: ['created_at']
        }
      ]
    }
  );

  return Notification;
};
