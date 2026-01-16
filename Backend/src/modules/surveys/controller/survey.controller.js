// src/modules/surveys/controller/survey.controller.js
const surveyService = require('../service/survey.service');
const logger = require('../../../utils/logger');

class SurveyController {
  /**
   * Get all surveys
   */
  async getAllSurveys(req, res) {
    try {
      const { page, limit, status, target_audience, search, source } = req.query;

      const result = await surveyService.getAllSurveys(
        { page, limit, status, target_audience, search, source },
        req.user
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get surveys error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching surveys'
      });
    }
  }

  /**
   * Get surveys assigned to the current user
   */
  async getAssignedSurveys(req, res) {
    try {
      const { page, limit, status, search } = req.query;

      const result = await surveyService.getAssignedSurveys(
        req.user.id,
        req.user.email,
        status || 'pending',
        { page, limit, search }
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get assigned surveys error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching assigned surveys'
      });
    }
  }
  /**
   * Get survey by ID
   */
  async getSurveyById(req, res) {
    try {
      const { id } = req.params;

      const survey = await surveyService.getSurveyById(id, req.user);

      if (!survey) {
        return res.status(404).json({
          success: false,
          message: 'Survey not found'
        });
      }

      res.status(200).json({
        success: true,
        data: { survey }
      });
    } catch (error) {
      logger.error('Get survey error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching survey'
      });
    }
  }

  /**
   * Create new survey
   */
  async createSurvey(req, res) {
    try {
      const { template_id, title, description, start_date, end_date, target_audience, target_value } = req.body;

      // Validation
      if (!template_id || !title) {
        return res.status(400).json({
          success: false,
          message: 'Template ID and title are required'
        });
      }

      const survey = await surveyService.createSurvey(req.body, req.user);

      res.status(201).json({
        success: true,
        message: 'Survey created successfully',
        data: { survey }
      });
    } catch (error) {
      logger.error('Create survey error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error creating survey'
      });
    }
  }

  /**
   * Update survey
   */
  async updateSurvey(req, res) {
    try {
      const { id } = req.params;

      const survey = await surveyService.updateSurvey(id, req.body, req.user);

      res.status(200).json({
        success: true,
        message: 'Survey updated successfully',
        data: { survey }
      });
    } catch (error) {
      logger.error('Update survey error:', error);

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
        message: error.message || 'Error updating survey'
      });
    }
  }

  /**
   * Delete survey
   */
  async deleteSurvey(req, res) {
    try {
      const { id } = req.params;

      await surveyService.deleteSurvey(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Survey deleted successfully'
      });
    } catch (error) {
      logger.error('Delete survey error:', error);

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
        message: error.message || 'Error deleting survey'
      });
    }
  }

  /**
   * Bulk delete surveys
   */
  async deleteSurveys(req, res) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Survey IDs are required'
        });
      }

      const result = await surveyService.deleteSurveys(ids, req.user);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Bulk delete surveys error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error deleting surveys'
      });
    }
  }

  /**
   * Get survey statistics
   */
  async getSurveyStats(req, res) {
    try {
      const { id } = req.params;

      const stats = await surveyService.getSurveyStats(id, req.user);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get survey stats error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching survey statistics'
      });
    }
  }

  /**
   * Publish survey
   */
  async publishSurvey(req, res) {
    try {
      const { id } = req.params;

      const survey = await surveyService.publishSurvey(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Survey published successfully',
        data: { survey }
      });
    } catch (error) {
      logger.error('Publish survey error:', error);

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

      res.status(400).json({
        success: false,
        message: error.message || 'Error publishing survey'
      });
    }
  }

  /**
   * Close survey
   */
  async closeSurvey(req, res) {
    try {
      const { id } = req.params;

      const survey = await surveyService.closeSurvey(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Survey closed successfully',
        data: { survey }
      });
    } catch (error) {
      logger.error('Close survey error:', error);

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

      res.status(400).json({
        success: false,
        message: error.message || 'Error closing survey'
      });
    }
  }

  /**
   * Update survey status
   */
  async updateSurveyStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const survey = await surveyService.updateSurveyStatus(id, status, req.user);

      res.status(200).json({
        success: true,
        message: `Survey status updated to ${status}`,
        data: { survey }
      });
    } catch (error) {
      logger.error('Update survey status error:', error);

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

      res.status(400).json({
        success: false,
        message: error.message || 'Error updating survey status'
      });
    }
  }

  /**
   * Restore survey
   */
  async restoreSurvey(req, res) {
    try {
      const { id } = req.params;

      const survey = await surveyService.restoreSurvey(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Survey restored successfully',
        data: { survey }
      });
    } catch (error) {
      logger.error('Restore survey error:', error);

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

    }
  }
}

module.exports = new SurveyController();
