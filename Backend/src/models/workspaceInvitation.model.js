// src/models/workspaceInvitation.model.js
module.exports = (sequelize, DataTypes) => {
  const WorkspaceInvitation = sequelize.define(
    'WorkspaceInvitation',
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
      inviter_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      invitee_email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      invitee_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('collaborator', 'member', 'viewer'),
        defaultValue: 'member',
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'declined', 'expired', 'cancelled'),
        defaultValue: 'pending',
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'workspace_invitations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['workspace_id', 'invitee_email'],
          name: 'unique_workspace_invitee'
        },
        {
          fields: ['token']
        },
        {
          fields: ['invitee_email']
        },
        {
          fields: ['status']
        }
      ]
    }
  );

  return WorkspaceInvitation;
};