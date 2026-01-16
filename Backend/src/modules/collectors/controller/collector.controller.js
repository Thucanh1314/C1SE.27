// src/modules/collectors/controller/collector.controller.js
const collectorService = require('../service/collector.service');
const logger = require('../../../utils/logger');

class CollectorController {
  /**
   * Get collectors for survey (URL param version)
   */
  async getCollectorsBySurvey(req, res) {
    try {
      const { survey_id } = req.params;

      const collectors = await collectorService.getCollectorsBySurvey(survey_id, req.user);

      res.status(200).json({
        success: true,
        data: collectors
      });
    } catch (error) {
      logger.error('Get collectors error:', error);

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
        message: error.message || 'Error fetching collectors'
      });
    }
  }

  /**
   * Get collectors for survey (query param version - backward compatibility)
   */
  async getCollectorsBySurveyQuery(req, res) {
    try {
      const { survey_id } = req.query;

      if (!survey_id) {
        return res.status(400).json({
          success: false,
          message: 'survey_id query parameter is required'
        });
      }

      const collectors = await collectorService.getCollectorsBySurvey(survey_id, req.user);

      res.status(200).json({
        success: true,
        data: collectors
      });
    } catch (error) {
      logger.error('Get collectors by query error:', error);

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
        message: error.message || 'Error fetching collectors'
      });
    }
  }

  /**
   * Create collector
   */
  async createCollector(req, res) {
    try {
      const { survey_id } = req.params;

      const collector = await collectorService.createCollector(survey_id, req.body, req.user);

      res.status(201).json({
        success: true,
        message: 'Collector created successfully',
        data: collector
      });
    } catch (error) {
      logger.error('Create collector error:', error);

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
        message: error.message || 'Error creating collector'
      });
    }
  }

  /**
   * Get collector by token (public endpoint)
   */
  async getCollectorByToken(req, res) {
    try {
      const { token } = req.params;

      const data = await collectorService.getCollectorByToken(token);

      res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Get collector by token error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('not active') || error.message.includes('not currently accepting')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching collector'
      });
    }
  }

  /**
   * Update collector
   */
  async updateCollector(req, res) {
    try {
      const { id } = req.params;

      const collector = await collectorService.updateCollector(id, req.body, req.user);

      res.status(200).json({
        success: true,
        message: 'Collector updated successfully',
        data: collector
      });
    } catch (error) {
      logger.error('Update collector error:', error);

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
        message: error.message || 'Error updating collector'
      });
    }
  }

  /**
   * Delete collector
   */
  async deleteCollector(req, res) {
    try {
      const { id } = req.params;

      const result = await collectorService.deleteCollector(id, req.user);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      logger.error('Delete collector error:', error);

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
        message: error.message || 'Error deleting collector'
      });
    }
  }
}

module.exports = new CollectorController();
