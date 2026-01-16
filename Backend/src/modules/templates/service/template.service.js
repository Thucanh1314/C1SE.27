// src/modules/templates/service/template.service.js
const { SurveyTemplate, Question, QuestionOption, QuestionType, User } = require('../../../models');
const { Op } = require('sequelize');
const { QUESTION_TYPES } = require('../../../constants/questionTypes');

class TemplateService {
  /**
   * Get all templates
   */
  async getAllTemplates(options = {}, user) {
    const { page = 1, limit = 10, search, scope = 'my' } = options;
    const offset = (page - 1) * limit;
    const where = {};

    // Scope Logic
    // Default to 'my' templates (created_by me)
    // Only allow 'all' if user is Admin
    if (scope === 'all' && user.role === 'admin') {
      // No filter, show all
    } else {
      // Force 'my' scope: only templates created by this user
      where.created_by = user.id;
    }

    // Search filter
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await SurveyTemplate.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      attributes: {
        include: [
          [
            SurveyTemplate.sequelize.literal(`(
              SELECT COUNT(*)
              FROM questions AS Question
              WHERE
                Question.template_id = SurveyTemplate.id
            )`),
            'questionCount'
          ]
        ]
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'full_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return {
      templates: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get template by ID with questions
   */
  async getTemplateById(templateId) {
    const template = await SurveyTemplate.findByPk(templateId, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'full_name']
        },
        {
          model: Question,
          as: 'Questions',
          include: [
            {
              model: QuestionType,
              as: 'QuestionType',
              attributes: ['id', 'type_name']
            },
            {
              model: QuestionOption,
              as: 'QuestionOptions',
              attributes: ['id', 'option_text', 'display_order']
            }
          ],
          order: [['display_order', 'ASC']]
        }
      ]
    });

    return template;
  }

  /**
   * Create new template
   */
  async createTemplate(templateData, user) {
    const { title, description, questions } = templateData;

    // Create template
    const template = await SurveyTemplate.create({
      title,
      description,
      created_by: user.id
    });

    // Create questions if provided
    if (questions && Array.isArray(questions) && questions.length > 0) {
      const questionPromises = questions.map((q, index) => {
        return Question.create({
          survey_template_id: template.id,
          question_type_id: q.question_type_id,
          question_text: q.question_text,
          is_required: q.is_required !== undefined ? q.is_required : false,
          display_order: q.display_order !== undefined ? q.display_order : index + 1
        });
      });

      const createdQuestions = await Promise.all(questionPromises);

      // Create options for each question
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          const optionPromises = q.options.map((opt, optIndex) => {
            return QuestionOption.create({
              question_id: createdQuestions[i].id,
              option_text: opt.option_text,
              display_order: opt.display_order !== undefined ? opt.display_order : optIndex + 1
            });
          });

          await Promise.all(optionPromises);
        }
      }
    }

    return this.getTemplateById(template.id);
  }

  /**
   * Update template
   */
  async updateTemplate(templateId, updateData, user) {
    const template = await SurveyTemplate.findByPk(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // Check ownership
    if (user.role !== 'admin' && template.created_by !== user.id) {
      throw new Error('Access denied. You do not own this template.');
    }

    // Update template fields
    if (updateData.title) template.title = updateData.title;
    if (updateData.description !== undefined) template.description = updateData.description;

    await template.save();

    return this.getTemplateById(templateId);
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId, user) {
    const template = await SurveyTemplate.findByPk(templateId);

    if (!template) {
      throw new Error('Template not found');
    }

    // Check ownership
    if (user.role !== 'admin' && template.created_by !== user.id) {
      throw new Error('Access denied. You do not own this template.');
    }

    await template.destroy();

    return { message: 'Template deleted successfully' };
  }

  /**
   * Bulk delete templates
   */
  async deleteTemplates(templateIds, user) {
    if (!Array.isArray(templateIds) || templateIds.length === 0) {
      throw new Error('No template IDs provided');
    }

    const where = {
      id: { [Op.in]: templateIds }
    };

    // If not admin, restrict to own templates
    if (user.role !== 'admin') {
      where.created_by = user.id;
    }

    const count = await SurveyTemplate.count({ where });

    if (count === 0) {
      throw new Error('No templates found or access denied');
    }

    await SurveyTemplate.destroy({ where });

    return { message: `${count} templates deleted successfully` };
  }

  /**
   * Add question to template
   */
  async addQuestion(templateId, questionData, user) {
    const sequelize = require('../../../models').sequelize;

    // Use a transaction to ensure atomicity
    const transaction = await sequelize.transaction();

    try {
      const template = await SurveyTemplate.findByPk(templateId, { transaction });

      if (!template) {
        await transaction.rollback();
        throw new Error('Template not found');
      }

      // Check ownership
      if (user.role !== 'admin' && template.created_by !== user.id) {
        await transaction.rollback();
        throw new Error('Access denied. You do not own this template.');
      }

      // Validate Question Type
      const typeId = parseInt(questionData.question_type_id);
      if (!Object.values(QUESTION_TYPES).includes(typeId)) {
        await transaction.rollback();
        throw new Error(`Invalid Question Type ID: ${typeId}`);
      }

      // Create the question
      const question = await Question.create({
        template_id: templateId,
        label: questionData.label || questionData.question_text, // Use label if provided, otherwise use question_text
        question_text: questionData.question_text,
        question_type_id: typeId,
        required: questionData.required || questionData.is_required || false,
        display_order: questionData.display_order || 1
      }, { transaction });

      // Create options if provided - with strict validation
      if (questionData.options && Array.isArray(questionData.options) && questionData.options.length > 0) {
        // Filter and process options - support both string arrays and object arrays
        const validOptions = questionData.options.filter(opt => {
          // Handle string options (from frontend)
          if (typeof opt === 'string') {
            return opt.trim().length > 0;
          }

          // Handle object options
          if (opt && typeof opt === 'object') {
            const optionText = opt.option_text || opt.text || opt.label || opt.value;
            return optionText &&
              typeof optionText === 'string' &&
              optionText.trim().length > 0;
          }

          return false;
        });

        // Only create options if we have valid ones
        if (validOptions.length > 0) {
          for (let i = 0; i < validOptions.length; i++) {
            const opt = validOptions[i];

            let optionText;
            let displayOrder = i + 1;

            // Handle string options (from frontend filter)
            if (typeof opt === 'string') {
              optionText = opt.trim();
            } else {
              // Handle object options
              optionText = (opt.option_text || opt.text || opt.label || opt.value).trim();
              displayOrder = opt.display_order !== undefined ? opt.display_order : i + 1;
            }

            // Create each option individually with proper error handling
            await QuestionOption.create({
              question_id: question.id,
              option_text: optionText,
              display_order: displayOrder
            }, { transaction });
          }
        }
      }

      // Commit the transaction
      await transaction.commit();

      return this.getTemplateById(templateId);

    } catch (error) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all question types
   */
  async getQuestionTypes() {
    const types = await QuestionType.findAll({
      order: [['id', 'ASC']]
    });

    return types;
  }
}

module.exports = new TemplateService();
