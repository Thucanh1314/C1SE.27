// src/models/surveyFeedback.model.js
module.exports = (sequelize, DataTypes) => {
    const SurveyFeedback = sequelize.define(
        'SurveyFeedback',
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            survey_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Survey this feedback belongs to'
            },
            response_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'Linked response ID (null for internal feedback)'
            },
            rating: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: 1,
                    max: 5
                },
                comment: 'Rating 1-5'
            },
            comment: {
                type: DataTypes.STRING(500),
                allowNull: true,
                comment: 'Optional user comment'
            },
            source: {
                type: DataTypes.ENUM('respondent', 'email', 'internal'),
                defaultValue: 'respondent',
                comment: 'Source of the feedback'
            },
            is_processed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                comment: 'Whether this feedback has been reviewed/processed'
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
            tableName: 'survey_feedback',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            indexes: [
                {
                    fields: ['survey_id']
                },
                {
                    fields: ['response_id']
                }
            ]
        }
    );

    return SurveyFeedback;
};
