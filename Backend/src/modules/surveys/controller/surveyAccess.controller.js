// src/modules/surveys/controller/surveyAccess.controller.js
const surveyAccessService = require('../service/surveyAccess.service');
const logger = require('../../../utils/logger');
const { Survey, WorkspaceMember } = require('../../../models'); // Added import for models

class SurveyAccessController {
  /**
   * POST /api/modules/surveys/:id/access
   * Grant access to a survey
   */
  async grantAccess(req, res) {
    try {
      const { id: surveyId } = req.params;
      const { user_id, access_type = 'respond', expires_at = null, notes = null } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      const access = await surveyAccessService.grantAccess(
        surveyId,
        user_id,
        { access_type, expires_at, notes },
        req.user.id
      );

      res.status(201).json({
        success: true,
        message: 'Access granted successfully',
        data: access
      });
    } catch (error) {
      logger.error('Grant survey access error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error granting access'
      });
    }
  }

  /**
   * DELETE /api/modules/surveys/:id/access/:userId
   * Revoke access to a survey
   */
  async revokeAccess(req, res) {
    try {
      const { id: surveyId, userId } = req.params;

      await surveyAccessService.revokeAccess(surveyId, userId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Access revoked successfully'
      });
    } catch (error) {
      logger.error('Revoke survey access error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error revoking access'
      });
    }
  }

  /**
   * GET /api/modules/surveys/:id/access
   * Get access grants for a survey
   */
  async getSurveyAccessGrants(req, res) {
    try {
      const { id: surveyId } = req.params;

      const accessGrants = await surveyAccessService.getSurveyAccessGrants(surveyId, req.user);

      res.status(200).json({
        success: true,
        data: accessGrants
      });
    } catch (error) {
      logger.error('Get survey access grants error:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching access grants'
      });
    }
  }

  /**
   * GET /api/modules/surveys/my-accessible
   * Get surveys user has access to (not as creator)
   */
  async getMyAccessibleSurveys(req, res) {
    try {
      const surveys = await surveyAccessService.getUserAccessibleSurveys(req.user.id);

      res.status(200).json({
        success: true,
        data: surveys
      });
    } catch (error) {
      logger.error('Get accessible surveys error:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching accessible surveys'
      });
    }
  }

  /**
   * GET /api/modules/surveys/:id/my-access
   * Get user's access level for a specific survey
   */
  async getMyAccess(req, res) {
    try {
      const { id: surveyId } = req.params;

      const access = await surveyAccessService.getUserSurveyAccess(surveyId, req.user.id);

      res.status(200).json({
        success: true,
        data: access
      });
    } catch (error) {
      logger.error('Get user survey access error:', error);

      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching access information'
      });
    }
  }
}

module.exports = new SurveyAccessController();