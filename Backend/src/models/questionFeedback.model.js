const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QuestionFeedback = sequelize.define('QuestionFeedback', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    survey_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'surveys',
            key: 'id'
        }
    },
    question_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'questions',
            key: 'id'
        }
    },
    respondent_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // Optional, for logged-in users
        references: {
            model: 'users',
            key: 'id'
        }
    },
    is_helpful: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        comment: 'True if helpful, False if not helpful'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'question_feedbacks',
    timestamps: true,
    updatedAt: false, // We only track creation
    underscored: true
});

module.exports = QuestionFeedback;
