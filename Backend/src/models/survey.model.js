// src/models/survey.model.js
module.exports = (sequelize, DataTypes) => {
  const Survey = sequelize.define(
    'Survey',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      target_audience: {
        type: DataTypes.ENUM('all_users', 'specific_group', 'custom'),
        defaultValue: 'all_users',
      },
      target_value: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'closed', 'analyzed', 'archived'),
        defaultValue: 'draft',
      },
      // Simple Survey Access Control - 4 main types
      access_type: {
        type: DataTypes.ENUM('public', 'public_with_login', 'private', 'internal'),
        allowNull: false,
        defaultValue: 'public',
        comment: 'Access control: public (anonymous), public_with_login, private (invite only), internal (workspace members)'
      },
      require_login: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether login is required to respond'
      },
      allow_anonymous: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether anonymous responses are allowed'
      },
      workspace_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'workspaces',
          key: 'id'
        },
        comment: 'Workspace ID for internal access'
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      hooks: {
        beforeUpdate: async (survey, options) => {
          // Fields that define structure/container
          const structuralFields = ['template_id', 'workspace_id', 'access_type'];
          const changedStructuralFields = structuralFields.filter(field => survey.changed(field));

          if (changedStructuralFields.length > 0) {
            // Check Lock Conditions
            // 1. Status Check
            if (survey.status !== 'draft') {
              throw new Error(`Cannot update ${changedStructuralFields.join(', ')} because survey is not in draft status.`);
            }

            // 2. Response Check
            const responseCount = await sequelize.models.SurveyResponse.count({
              where: { survey_id: survey.id }
            });

            if (responseCount > 0) {
              throw new Error(`Cannot update ${changedStructuralFields.join(', ')} because survey already has responses.`);
            }
          }
        }
      },
      tableName: 'surveys',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Survey;
};
