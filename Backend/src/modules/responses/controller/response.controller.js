// src/modules/responses/controller/response.controller.js
const responseService = require('../service/response.service');
const logger = require('../../../utils/logger');

class ResponseController {
  /**
   * Submit survey response
   */
  async submitResponse(req, res) {
    try {
      const { survey_id, answers } = req.body;

      // Validation
      if (!survey_id || !answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Survey ID and answers array are required'
        });
      }

      const response = await responseService.submitResponse(req.body, req.user);

      res.status(201).json({
        success: true,
        message: 'Response submitted successfully',
        data: { response }
      });
    } catch (error) {
      logger.error('Submit response error:', error);

      if (error.message.includes('not found') || error.message.includes('not active')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already responded')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error submitting response'
      });
    }
  }

  /**
   * Get response by ID
   */
  async getResponseById(req, res) {
    try {
      const { id } = req.params;

      const response = await responseService.getResponseById(id, req.user);

      if (!response) {
        return res.status(404).json({
          success: false,
          message: 'Response not found'
        });
      }

      res.status(200).json({
        success: true,
        data: { response }
      });
    } catch (error) {
      logger.error('Get response error:', error);

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching response'
      });
    }
  }

  /**
   * Get all responses for a survey
   */
  async getResponsesBySurvey(req, res) {
    try {
      const { survey_id } = req.params;
      const { page, limit } = req.query;

      const result = await responseService.getResponsesBySurvey(
        survey_id,
        req.user,
        { page, limit }
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get survey responses error:', error);

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
        message: error.message || 'Error fetching responses'
      });
    }
  }

  /**
   * Get user's own responses with enhanced filtering
   */
  async getUserResponses(req, res) {
    try {
      const {
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
        includeAnswers
      } = req.query;

      // Convert string boolean to actual boolean
      const includeAnswersFlag = includeAnswers === 'true';

      const result = await responseService.getUserResponses(req.user, {
        page,
        limit,
        search,
        status,
        sortBy,
        sortOrder,
        includeAnswers: includeAnswersFlag
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Get user responses error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching user responses'
      });
    }
  }

  /**
   * Get detailed user response with all answers
   */
  async getUserResponseDetail(req, res) {
    try {
      const { id } = req.params;

      const response = await responseService.getUserResponseDetail(id, req.user);

      res.status(200).json({
        success: true,
        data: { response }
      });
    } catch (error) {
      logger.error('Get user response detail error:', error);

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching response details'
      });
    }
  }

  /**
   * Delete response
   */
  async deleteResponse(req, res) {
    try {
      const { id } = req.params;

      await responseService.deleteResponse(id, req.user);

      res.status(200).json({
        success: true,
        message: 'Response deleted successfully'
      });
    } catch (error) {
      logger.error('Delete response error:', error);

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
        message: error.message || 'Error deleting response'
      });
    }
  }

  /**
   * Submit public/anonymous response via collector token
   */
  async submitPublicResponse(req, res) {
    try {
      const { token } = req.params;
      const { answers } = req.body;

      // Validation
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Answers array is required'
        });
      }

      // Hardening: Require client_response_id
      if (!req.body.client_response_id && !req.body.response_id) {
        // We allow response_id for legacy re-submissions or if explicit, but client_response_id should be there for new flow
        // For now, warn or fail? User request said "Require client_response_id for all public save/submit endpoints."
        // Let's enforce it if response_id is missing.
        return res.status(400).json({
          success: false,
          message: 'client_response_id is required for idempotency'
        });
      }

      // Get user identifier (IP address or custom ID)
      const userIdentifier = req.body.identifier || req.ip || req.headers['x-forwarded-for'];

      // Pass user object if authenticated
      const user = req.user;

      const response = await responseService.submitPublicResponse(token, req.body, userIdentifier, user);

      res.status(201).json({
        success: true,
        message: response.message,
        data: {
          response_id: response.response_id,
          survey_id: response.survey_id,
          submitted_at: response.submitted_at
        }
      });
    } catch (error) {
      logger.error('Submit public response error:', error);

      if (error.message.includes('Invalid token') || error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('not active') || error.message.includes('not currently accepting') || error.message.includes('has ended')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already responded')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error submitting public response'
      });
    }
  }
  /**
   * Start a survey session
   */
  async startSession(req, res) {
    try {
      const { id } = req.params; // Survey ID
      const { collector_token, session_id, client_response_id } = req.body;
      const user = req.user; // Optional

      const response = await responseService.startSession(id, collector_token, req.ip, user, session_id, client_response_id);

      res.status(201).json({
        success: true,
        message: 'Session started',
        data: {
          response_id: response.id,
          start_time: response.start_time
        }
      });
    } catch (error) {
      logger.error('Start session error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error starting session'
      });
    }
  }

  /**
   * Fix stuck response by marking as completed
   */
  async completeResponse(req, res) {
    try {
      const { id } = req.params;
      
      // Only allow admin to fix responses
      if (req.user.role !== 'admin' && req.user.role !== 'creator') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin/Creator only.'
        });
      }

      const result = await responseService.completeStuckResponse(id);

      res.status(200).json({
        success: true,
        message: 'Response completed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Complete response error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error completing response'
      });
    }
  }

}

module.exports = new ResponseController();
