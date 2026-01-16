// src/models/generatedQuestion.model.js
module.exports = (sequelize, DataTypes) => {
    const GeneratedQuestion = sequelize.define(
        'GeneratedQuestion',
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            question_text: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            question_type: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            options: {
                type: DataTypes.TEXT, // Using TEXT for stringified JSON to ensure MySQL compatibility
                allowNull: true,
                comment: 'JSON string of options'
            },
            keyword: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            category: {
                type: DataTypes.STRING(100),
                allowNull: true,
                defaultValue: 'general'
            },
            source_model: {
                type: DataTypes.STRING(100),
                allowNull: true,
                defaultValue: 'gemini'
            },
            generated_by: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'User ID who triggered generation'
            },
            quality_score: {
                type: DataTypes.FLOAT,
                defaultValue: 0,
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            }
        },
        {
            tableName: 'generated_questions',
            timestamps: true,
            updatedAt: false, // Only need creation time
            createdAt: 'created_at',
        }
    );

    return GeneratedQuestion;
};
