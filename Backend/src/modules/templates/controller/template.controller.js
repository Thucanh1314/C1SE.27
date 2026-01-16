// src/modules/templates/controller/template.controller.js
const templateService = require('../service/template.service');
const logger = require('../../../utils/logger');

class TemplateController {
  /**
   * Get all templates
   */
  async getAllTemplates(req, res) {
    try {
      const { page, limit, search, scope } = req.query;

      const result = await templateService.getAllTemplates(
        { page, limit, search, scope },
        req.user
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get templates error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching templates'
      });
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(req, res) {
    try {
      const { id } = req.params;

      const template = await templateService.getTemplateById(id);

      if (!template) {
        return res.status(404).json({
          success: false,
          message: 'Template not found'
        });
      }

      // Extract questions from the template object and format the response correctly
      const rawQuestions = template.Questions || [];

      // Format questions for frontend compatibility
      const questions = rawQuestions.map(question => ({
        id: question.id,
        template_id: question.template_id,
        label: question.label,
        question_text: question.question_text,
        question_type_id: question.question_type_id,
        type: question.QuestionType?.type_name || 'text', // Map to frontend expected format
        question_type: question.QuestionType?.type_name || 'text', // Alternative field name
        required: question.required,
        is_required: question.required, // Alternative field name for compatibility
        display_order: question.display_order,
        options: (question.QuestionOptions || []).map(opt => ({
          id: opt.id,
          option_text: opt.option_text,
          text: opt.option_text, // Alternative field name
          display_order: opt.display_order
        })),
        QuestionType: question.QuestionType,
        QuestionOptions: question.QuestionOptions
      }));

      const templateData = {
        id: template.id,
        title: template.title,
        description: template.description,
        created_by: template.created_by,
        status: template.status,
        is_archived: template.is_archived,
        created_at: template.created_at,
        updated_at: template.updated_at,
        User: template.User
      };

      res.status(200).json({
        success: true,
        ok: true,
        template: templateData,
        questions: questions
      });
    } catch (error) {
      logger.error('Get template error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching template'
      });
    }
  }

  /**
   * Create new template
   */
  async createTemplate(req, res) {
    try {
      const { title, description, questions } = req.body;

      // Validation
      if (!title) {
        return res.status(400).json({
          success: false,
          message: 'Title is required'
        });
      }

      const template = await templateService.createTemplate(req.body, req.user);

      res.status(201).json({
        success: true,
        message: 'Template created successfully',
        data: { template }
      });
    } catch (error) {
      logger.error('Create template error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error creating template'
      });
    }
  }

  /**
   * Update template
   */
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await templateService.updateTemplate(id, req.body, req.user);

      res.status(200).json({
        success: true,
        message: 'Template updated successfully',
        data: { template }
      });
    } catch (error) {
      logger.error('Update template error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error updating template'
      });
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(req, res) {
    try {
      const { id } = req.params;

      await templateService.deleteTemplate(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Template deleted successfully'
      });
    } catch (error) {
      logger.error('Delete template error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting template'
      });
    }
  }

  /**
   * Bulk delete templates
   */
  async deleteTemplates(req, res) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Template IDs are required'
        });
      }

      const result = await templateService.deleteTemplates(ids, req.user);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Bulk delete templates error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting templates'
      });
    }
  }

  /**
   * Add question to template
   */
  async addQuestion(req, res) {
    try {
      const { id } = req.params;
      const { question_type_id, question_text, is_required, display_order, options } = req.body;

      // Validation
      if (!question_type_id || !question_text) {
        return res.status(400).json({
          success: false,
          message: 'Question type and text are required'
        });
      }

      const template = await templateService.addQuestion(id, req.body, req.user);

      res.status(201).json({
        success: true,
        message: 'Question added successfully',
        data: { template }
      });
    } catch (error) {
      logger.error('Add question error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error adding question'
      });
    }
  }

  /**
   * Get question types
   */
  async getQuestionTypes(req, res) {
    try {
      const types = await templateService.getQuestionTypes();

      res.status(200).json({
        success: true,
        data: { types }
      });
    } catch (error) {
      logger.error('Get question types error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching question types'
      });
    }
  }
}

module.exports = new TemplateController();
