// src/models/questionOption.model.js
module.exports = (sequelize, DataTypes) => {
  const QuestionOption = sequelize.define(
    'QuestionOption',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      option_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      display_order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'display_order',
      },
    },
    {
      hooks: {
        beforeUpdate: async (option, options) => {
          if (!option.changed('option_text')) return;

          const { Question, Survey, SurveyResponse } = sequelize.models;
          const question = await Question.findByPk(option.question_id);
          if (!question) return;

          if (question.survey_id) {
            const survey = await Survey.findByPk(question.survey_id);
            if (survey && (survey.status !== 'draft' || (await SurveyResponse.count({ where: { survey_id: survey.id } })) > 0)) {
              throw new Error('Cannot update option because survey is live or has responses.');
            }
          } else if (question.template_id) {
            const surveys = await Survey.findAll({ where: { template_id: question.template_id } });
            for (const survey of surveys) {
              const responseCount = await SurveyResponse.count({ where: { survey_id: survey.id } });
              if (survey.status !== 'draft' || responseCount > 0) {
                throw new Error('Cannot update option because linked survey is live or has responses.');
              }
            }
          }
        },
        beforeDestroy: async (option, options) => {
          const { Question, Survey, SurveyResponse } = sequelize.models;
          const question = await Question.findByPk(option.question_id);
          if (!question) return;

          if (question.survey_id) {
            const survey = await Survey.findByPk(question.survey_id);
            if (survey && (survey.status !== 'draft' || (await SurveyResponse.count({ where: { survey_id: survey.id } })) > 0)) {
              throw new Error('Cannot delete option because survey is live or has responses.');
            }
          } else if (question.template_id) {
            const surveys = await Survey.findAll({ where: { template_id: question.template_id } });
            for (const survey of surveys) {
              const responseCount = await SurveyResponse.count({ where: { survey_id: survey.id } });
              if (survey.status !== 'draft' || responseCount > 0) {
                throw new Error('Cannot delete option because linked survey is live or has responses.');
              }
            }
          }
        }
      },
      tableName: 'question_options',
      timestamps: false,
    }
  );

  return QuestionOption;
};
