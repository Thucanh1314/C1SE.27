// src/models/question.model.js
module.exports = (sequelize, DataTypes) => {
  const Question = sequelize.define(
    'Question',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'template_id',
      },
      survey_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Assuming it can be null based on previous errors not mentioning it, but safer to include
      },
      label: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      question_type_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'question_type_id',
      },
      required: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'display_order',
      },
      is_ai_generated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_ai_generated'
      },
    },
    {
      hooks: {
        beforeUpdate: async (question, options) => {
          const criticalFields = ['question_text', 'question_type_id', 'required', 'label'];
          if (!criticalFields.some(field => question.changed(field))) {
            return;
          }

          const { Survey, SurveyResponse } = sequelize.models;

          let lockedSurveys = [];

          if (question.survey_id) {
            // Direct Link
            const survey = await Survey.findByPk(question.survey_id);
            if (survey) {
              const responseCount = await SurveyResponse.count({ where: { survey_id: survey.id } });
              if (survey.status !== 'draft' || responseCount > 0) {
                lockedSurveys.push(survey);
              }
            }
          } else if (question.template_id) {
            // Template Link - Check ALL surveys using this template
            const surveys = await Survey.findAll({
              where: { template_id: question.template_id }
            });

            for (const survey of surveys) {
              const responseCount = await SurveyResponse.count({ where: { survey_id: survey.id } });
              if (survey.status !== 'draft' || responseCount > 0) {
                lockedSurveys.push(survey);
                break; // One is enough to block
              }
            }
          }

          if (lockedSurveys.length > 0) {
            throw new Error('Cannot update question because it is used in active surveys or surveys with responses.');
          }
        },
        beforeDestroy: async (question, options) => {
          const { Survey, SurveyResponse } = sequelize.models;

          if (question.survey_id) {
            const survey = await Survey.findByPk(question.survey_id);
            if (survey) {
              const responseCount = await SurveyResponse.count({ where: { survey_id: survey.id } });
              if (survey.status !== 'draft' || responseCount > 0) {
                throw new Error('Cannot delete question because it belongs to a live/responded survey.');
              }
            }
          } else if (question.template_id) {
            const surveys = await Survey.findAll({ where: { template_id: question.template_id } });
            for (const survey of surveys) {
              const responseCount = await SurveyResponse.count({ where: { survey_id: survey.id } });
              if (survey.status !== 'draft' || responseCount > 0) {
                throw new Error('Cannot delete question because it is used in a live/responded survey.');
              }
            }
          }
        }
      },
      tableName: 'questions',
      timestamps: false,
      underscored: true,
    }
  );

  return Question;
};
