// src/modules/questions/service/question.service.js
const { Question, QuestionOption, SurveyTemplate, QuestionType } = require('../../../models');
const { QUESTION_TYPES, QUESTION_TYPE_NAMES } = require('../../../constants/questionTypes');
const sequelize = require('../../../models').sequelize;

class QuestionService {
    /**
     * Get all question types
     */
    async getQuestionTypes() {
        return await QuestionType.findAll();
    }

    /**
     * Update a question
     */
    async updateQuestion(questionId, updateData, user) {
        const transaction = await sequelize.transaction();
        try {
            const question = await Question.findByPk(questionId, { transaction });

            if (!question) {
                throw new Error('Question not found');
            }

            // Check ownership via Template
            // Note: Questions might belong to Template OR Survey directly (if future feature)
            // Currently, they belong to Template based on schema
            const template = await SurveyTemplate.findByPk(question.template_id, { transaction });

            if (!template) {
                throw new Error('Associated template not found');
            }

            if (user.role !== 'admin' && template.created_by !== user.id) {
                throw new Error('Access denied');
            }

            // Update fields
            if (updateData.label) question.label = updateData.label;
            if (updateData.question_text) question.question_text = updateData.question_text;
            if (updateData.required !== undefined) question.required = updateData.required;
            if (updateData.order !== undefined) question.display_order = updateData.order;

            // Handle Type Change
            if (updateData.question_type_id) {
                // Validate Type
                const typeId = parseInt(updateData.question_type_id);
                const isValid = Object.values(QUESTION_TYPES).includes(typeId);

                if (!isValid) {
                    // Fallback to OPEN_ENDED if unknown, or throw
                    // Here we throw to enforce strictness from frontend
                    throw new Error(`Invalid Question Type ID: ${typeId}`);
                }
                question.question_type_id = typeId;
            }

            await question.save({ transaction });

            // Handle Options Update if provided (full replace or specific logic?)
            // Front-end sends 'options' array usually for full replacement
            if (updateData.options && Array.isArray(updateData.options)) {
                // Validation: Types that need options
                const typesNeedingOptions = [
                    QUESTION_TYPES.SINGLE_CHOICE,
                    QUESTION_TYPES.MULTIPLE_CHOICE,
                    QUESTION_TYPES.DROPDOWN,
                    QUESTION_TYPES.CHECKBOX,
                    QUESTION_TYPES.RANKING
                ];

                if (typesNeedingOptions.includes(question.question_type_id)) {
                    // Replace logic: simplest is destroy all and recreate
                    // But we might want to preserve IDs if possible? 
                    // For now, simpler is destroy all for this question
                    await QuestionOption.destroy({ where: { question_id: question.id }, transaction });

                    for (let i = 0; i < updateData.options.length; i++) {
                        const optText = typeof updateData.options[i] === 'string'
                            ? updateData.options[i]
                            : (updateData.options[i].text || updateData.options[i].option_text);

                        if (optText && optText.trim()) {
                            await QuestionOption.create({
                                question_id: question.id,
                                option_text: optText.trim(),
                                display_order: i + 1
                            }, { transaction });
                        }
                    }
                }
            }

            await transaction.commit();
            return question;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Delete a question
     */
    async deleteQuestion(questionId, user) {
        const question = await Question.findByPk(questionId);
        if (!question) throw new Error('Question not found');

        const template = await SurveyTemplate.findByPk(question.template_id);
        if (user.role !== 'admin' && template.created_by !== user.id) {
            throw new Error('Access denied');
        }

        await question.destroy();
        return { message: 'Question deleted' };
    }

    /**
     * Add Option
     */
    async addOption(optionData, user) {
        // Validate ownership logic similar to above
        const question = await Question.findByPk(optionData.question_id);
        if (!question) throw new Error('Question not found');

        const template = await SurveyTemplate.findByPk(question.template_id);
        if (user.role !== 'admin' && template.created_by !== user.id) throw new Error('Access denied');

        return await QuestionOption.create({
            question_id: optionData.question_id,
            option_text: optionData.option_text,
            display_order: optionData.display_order || 0
        });
    }

    /**
    * Update Option
    */
    async updateOption(optionId, optionData, user) {
        const option = await QuestionOption.findByPk(optionId);
        if (!option) throw new Error('Option not found');

        const question = await Question.findByPk(option.question_id);
        const template = await SurveyTemplate.findByPk(question.template_id);
        if (user.role !== 'admin' && template.created_by !== user.id) throw new Error('Access denied');

        if (optionData.option_text) option.option_text = optionData.option_text;
        if (optionData.display_order !== undefined) option.display_order = optionData.display_order;

        await option.save();
        return option;
    }

    /**
     * Delete Option
     */
    async deleteOption(optionId, user) {
        const option = await QuestionOption.findByPk(optionId);
        if (!option) throw new Error('Option not found');

        const question = await Question.findByPk(option.question_id);
        const template = await SurveyTemplate.findByPk(question.template_id);
        if (user.role !== 'admin' && template.created_by !== user.id) throw new Error('Access denied');

        await option.destroy();
        return { message: 'Option deleted' };
    }
}

module.exports = new QuestionService();
