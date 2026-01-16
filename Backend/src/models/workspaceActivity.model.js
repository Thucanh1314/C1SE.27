// src/models/workspaceActivity.model.js
module.exports = (sequelize, DataTypes) => {
  const WorkspaceActivity = sequelize.define(
    'WorkspaceActivity',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      action: {
        type: DataTypes.ENUM(
          'created', 'joined', 'left', 'survey_created',
          'survey_updated', 'survey_deleted', 'member_invited', 'member_removed',
          'workspace_updated', 'workspace_deleted', 'invitation_sent', 'invitation_resent', 'invitation_cancelled',
          'member_role_requested', 'member_role_updated', 'analysis_finished'
        ),
        allowNull: false,
      },
      target_type: {
        type: DataTypes.ENUM('user', 'survey', 'workspace'),
        allowNull: true,
      },
      target_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: 'workspace_activities',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          fields: ['workspace_id']
        },
        {
          fields: ['user_id']
        },
        {
          fields: ['action']
        },
        {
          fields: ['created_at']
        }
      ]
    }
  );

  return WorkspaceActivity;
};