// modules/llm/controller/llm.controller.js
const llmService = require('../service/llm.service');
const logger = require('../../../utils/logger');

class LLMController {
  /**
   * Get categories
   */
  async getCategories(req, res) {
    try {
      const categories = await llmService.getCategories();
      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching categories'
      });
    }
  }

  /**
   * Generate questions using trained model
   */
  async generateQuestions(req, res) {
    try {
      const { topic, count = 5, category = 'general' } = req.body;

      if (!topic) {
        return res.status(400).json({
          success: false,
          message: 'Topic is required'
        });
      }

      const result = await llmService.generateQuestions({
        topic,
        count: parseInt(count),
        category,
        userId: req.user?.id
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Generate questions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generating questions'
      });
    }
  }

  /**
   * Get prompts
   */
  async getPrompts(req, res) {
    try {
      const { type } = req.query;
      const prompts = await llmService.getPrompts(type);
      res.status(200).json({
        success: true,
        data: prompts
      });
    } catch (error) {
      logger.error('Get prompts error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching prompts'
      });
    }
  }

  /**
   * Create prompt
   */
  async createPrompt(req, res) {
    try {
      const prompt = await llmService.createPrompt(req.body, req.user);
      res.status(201).json({
        success: true,
        data: prompt
      });
    } catch (error) {
      logger.error('Create prompt error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating prompt'
      });
    }
  }

  /**
   * Get specific prompt
   */
  async getPrompt(req, res) {
    try {
      const { id } = req.params;
      const prompt = await llmService.getPrompt(id);
      res.status(200).json({
        success: true,
        data: prompt
      });
    } catch (error) {
      logger.error('Get prompt error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Prompt not found'
      });
    }
  }

  /**
   * Update prompt
   */
  async updatePrompt(req, res) {
    try {
      const { id } = req.params;
      const prompt = await llmService.updatePrompt(id, req.body, req.user);
      res.status(200).json({
        success: true,
        data: prompt
      });
    } catch (error) {
      logger.error('Update prompt error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating prompt'
      });
    }
  }

  /**
   * Delete prompt
   */
  async deletePrompt(req, res) {
    try {
      const { id } = req.params;
      await llmService.deletePrompt(id, req.user);
      res.status(200).json({
        success: true,
        message: 'Prompt deleted successfully'
      });
    } catch (error) {
      logger.error('Delete prompt error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting prompt'
      });
    }
  }

  /**
   * Generate questions using AI
   */
  async generateQuestions(req, res) {
    const user = req.user;

    try {
      console.log('🔍 Generate Questions Request Body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 Request Headers:', req.headers['content-type']);

      // Validate request body
      const { topic, keyword, count = 5, category = 'general' } = req.body;

      // Accept both 'topic' and 'keyword' (frontend uses 'keyword')
      const questionTopic = topic || keyword;

      if (!questionTopic || typeof questionTopic !== 'string' || !questionTopic.trim()) {
        console.log('❌ Topic/keyword validation failed:', { topic, keyword, count, category });
        return res.status(400).json({
          success: false,
          message: 'Topic or keyword is required and must be a non-empty string',
          received: req.body
        });
      }

      // Validate count
      const questionCount = parseInt(count);
      if (isNaN(questionCount) || questionCount < 1 || questionCount > 20) {
        console.log('❌ Count validation failed:', { count, questionCount });
        return res.status(400).json({
          success: false,
          message: 'Count must be a number between 1 and 20'
        });
      }

      logger.info(`🤖 User ${user.username} generating ${questionCount} questions for topic: ${questionTopic}`);

      // Call LLM service to generate questions using trained model
      const result = await llmService.generateQuestionsFromTrainedModel(
        questionTopic.trim(),
        questionCount,
        category,
        user?.id
      );

      res.json({
        success: true,
        data: result,
        user_info: {
          user_id: user.id,
          username: user.username
        }
      });

    } catch (error) {
      logger.error(`❌ Error in generateQuestions: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to generate questions',
        error: error.message
      });
    }
  }

  /**
   * Predict category for text
   */
  async predictCategory(req, res) {
    try {
      const prediction = await llmService.predictCategory(req.body);
      res.status(200).json({
        success: true,
        data: prediction
      });
    } catch (error) {
      logger.error('Predict category error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error predicting category'
      });
    }
  }

  /**
   * Generate complete survey
   */
  async generateSurvey(req, res) {
    try {
      const survey = await llmService.generateSurvey(req.body);
      res.status(200).json({
        success: true,
        data: survey
      });
    } catch (error) {
      logger.error('Generate survey error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error generating survey'
      });
    }
  }

  /**
   * Test prompt
   */
  async testPrompt(req, res) {
    try {
      const { promptId } = req.params;
      const result = await llmService.testPrompt(promptId, req.body);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Test prompt error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error testing prompt'
      });
    }
  }

  /**
   * Create survey from generated questions
   */
  async createSurveyFromQuestions(req, res) {
    try {
      const {
        title,
        description,
        selectedQuestions,
        customQuestions,
        shareSettings,
        targetAudience,
        workspaceId,  // Add workspaceId
        startDate,
        endDate,
        quickInvite  // Add quickInvite
      } = req.body;

      if (!title || !selectedQuestions || selectedQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title and at least one question are required'
        });
      }

      // Validate workspace requirement for internal surveys
      if (targetAudience === 'internal' && !workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Workspace ID is required for internal surveys'
        });
      }

      const result = await llmService.createSurveyFromQuestions(
        req.user.id,
        {
          title,
          description,
          selectedQuestions,
          customQuestions: customQuestions || [],
          shareSettings,
          targetAudience,
          workspaceId,  // Pass workspaceId
          startDate,
          endDate,
          quickInvite  // Pass quickInvite
        }
      );

      // Customize message based on invitation results
      let message = 'Survey created successfully';
      if (result.invitations && result.invitations.sent > 0) {
        message = `Survey created and ${result.invitations.sent} invitation${result.invitations.sent > 1 ? 's' : ''} sent!`;
      }

      res.status(201).json({
        success: true,
        message,
        data: result
      });
    } catch (error) {
      logger.error('Create survey from questions error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating survey'
      });
    }
  }
  /**
   * Export survey as PDF (HTML preview)
   */
  async exportSurveyPDF(req, res) {
    try {
      const { surveyId } = req.params;
      const userId = req.user.userId;
      const pdfHtml = await llmService.generateSurveyPDF(surveyId, userId); // ← ĐÚNG!
      // Return HTML for PDF conversion
      res.setHeader('Content-Type', 'text/html');
      res.send(pdfHtml);
    } catch (error) {
      logger.error('Export survey PDF error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error exporting survey PDF'
      });
    }
  }


  /**
   * Generate public link for survey
   */
  async generatePublicLink(req, res) {
    try {
      const { surveyId } = req.params;
      const { expiryDays } = req.body;

      const linkData = await llmService.generatePublicLink(surveyId, req.user.id, expiryDays);

      res.status(200).json({
        success: true,
        data: linkData
      });
    } catch (error) {
      logger.error('Create public link error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error creating public link'
      });
    }
  }

  /**
   * Get survey by public link token
   */
  async getSurveyByToken(req, res) {
    try {
      const { token } = req.params;

      const survey = await llmService.getSurveyByPublicLink(token);

      res.json({
        success: true,
        data: survey
      });
    } catch (error) {
      logger.error('Get survey by token error:', error);
      res.status(404).json({
        success: false,
        message: error.message || 'Survey not found'
      });
    }
  }

  /**
   * Submit survey response
   */
  async submitSurveyResponse(req, res) {
    try {
      const { token } = req.params;
      const responseData = req.body;

      const result = await llmService.submitSurveyResponse(token, responseData);

      res.json({
        success: true,
        message: result.message,
        data: { responseId: result.responseId }
      });
    } catch (error) {
      logger.error('Submit survey response error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error submitting response'
      });
    }
  }

  /**
   * Get survey responses and analytics
   */
  async getSurveyResults(req, res) {
    try {
      const { surveyId } = req.params;
      const userId = req.user ? req.user.userId : 1; // Default to admin for demo

      const results = await llmService.getSurveyResponses(surveyId, userId);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Get survey results error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error getting survey results'
      });
    }
  }

  /**
   * Get survey responses and analytics (public access for demo)
   */
  async getSurveyResultsPublic(req, res) {
    try {
      const { surveyId } = req.params;
      const userId = 1; // Use admin user for public access

      const results = await llmService.getSurveyResponses(surveyId, userId);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Get survey results error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error getting survey results'
      });
    }
  }

  /**
   * Export survey as PDF (HTML preview)
   */
  async exportSurveyPDF(req, res) {
    try {
      const { surveyId } = req.params;
      const userId = req.user.userId;

      const pdfHtml = await llmService.generateSurveyPDF(surveyId, userId);

      // Return HTML for PDF conversion
      res.setHeader('Content-Type', 'text/html');
      res.send(pdfHtml);
    } catch (error) {
      logger.error('Export survey PDF error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error exporting survey PDF'
      });
    }
  }

  /**
   * Get survey for editing
   */
  async getSurveyForEditing(req, res) {
    try {
      const { surveyId } = req.params;
      const userId = req.user?.id;

      console.log('getSurveyForEditing - userId:', userId, 'req.user:', req.user);

      const result = await llmService.getSurveyForEditing(surveyId, userId);

      res.status(200).json({
        success: true,
        data: result.survey
      });
    } catch (error) {
      logger.error('Get survey for editing error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error getting survey for editing'
      });
    }
  }

  /**
   * Update survey settings
   */
  async updateSurveySettings(req, res) {
    try {
      const { surveyId } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;

      const result = await llmService.updateSurveySettings(surveyId, userId, updateData);

      res.status(200).json({
        success: true,
        data: result.survey,
        message: result.message
      });
    } catch (error) {
      logger.error('Update survey settings error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating survey settings'
      });
    }
  }

  /**
   * Update survey question
   */
  async updateSurveyQuestion(req, res) {
    try {
      const { surveyId, questionId } = req.params;
      const userId = req.user?.id;
      const questionData = req.body;

      const result = await llmService.updateSurveyQuestion(surveyId, questionId, userId, questionData);

      res.status(200).json({
        success: true,
        data: result.question,
        message: result.message
      });
    } catch (error) {
      logger.error('Update survey question error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error updating survey question'
      });
    }
  }

  /**
   * Delete survey question
   */
  async deleteSurveyQuestion(req, res) {
    try {
      const { surveyId, questionId } = req.params;
      const userId = req.user?.id;

      const result = await llmService.deleteSurveyQuestion(surveyId, questionId, userId);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Delete survey question error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting survey question'
      });
    }
  }

  /**
   * Add new survey question
   */
  async addSurveyQuestion(req, res) {
    try {
      const { surveyId } = req.params;
      const userId = req.user?.id;
      const questionData = req.body;

      const result = await llmService.addSurveyQuestion(surveyId, userId, questionData);

      res.status(201).json({
        success: true,
        data: result.question,
        message: result.message
      });
    } catch (error) {
      logger.error('Add survey question error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error adding survey question'
      });
    }
  }
}

// Create instance
const llmController = new LLMController();

module.exports = {
  getPrompts: llmController.getPrompts.bind(llmController),
  getCategories: llmController.getCategories.bind(llmController),
  generateQuestions: llmController.generateQuestions.bind(llmController),
  createSurveyFromQuestions: llmController.createSurveyFromQuestions.bind(llmController),
  exportSurveyPDF: llmController.exportSurveyPDF.bind(llmController),
  createPrompt: llmController.createPrompt.bind(llmController),
  getPrompt: llmController.getPrompt.bind(llmController),
  updatePrompt: llmController.updatePrompt.bind(llmController),
  deletePrompt: llmController.deletePrompt.bind(llmController),
  predictCategory: llmController.predictCategory.bind(llmController),
  generateSurvey: llmController.generateSurvey.bind(llmController),
  testPrompt: llmController.testPrompt.bind(llmController),
  generatePublicLink: llmController.generatePublicLink.bind(llmController),
  getSurveyByToken: llmController.getSurveyByToken.bind(llmController),
  submitSurveyResponse: llmController.submitSurveyResponse.bind(llmController),
  getSurveyResults: llmController.getSurveyResults.bind(llmController),
  getSurveyResultsPublic: llmController.getSurveyResultsPublic.bind(llmController),
  // Survey editing methods
  getSurveyForEditing: llmController.getSurveyForEditing.bind(llmController),
  updateSurveySettings: llmController.updateSurveySettings.bind(llmController),
  updateSurveyQuestion: llmController.updateSurveyQuestion.bind(llmController),
  deleteSurveyQuestion: llmController.deleteSurveyQuestion.bind(llmController),
  addSurveyQuestion: llmController.addSurveyQuestion.bind(llmController)
};