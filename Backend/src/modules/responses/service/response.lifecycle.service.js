// src/modules/responses/service/response.lifecycle.service.js
// Manage survey response lifecycle: started, completed, abandoned

const { SurveyResponse } = require('../../../models');
const logger = require('../../../utils/logger');

class ResponseLifecycleService {
  /**
   * Start a response (user begins filling survey)
   * Creates initial SurveyResponse record with status='started'
   */
  async startResponse(surveyId, collectorId, userId = null, sessionId = null) {
    try {
      const response = await SurveyResponse.create({
        survey_id: surveyId,
        collector_id: collectorId,
        respondent_id: userId,
        status: 'started',
        start_time: new Date(),
        first_interaction_at: new Date(),
        last_interaction_at: new Date(),
        session_id: sessionId
      });

      logger.info(`[ResponseLifecycle] Started response ${response.id} for survey ${surveyId}`);
      return response;
    } catch (error) {
      logger.error('[ResponseLifecycle] Error starting response:', error.message);
      throw error;
    }
  }

  /**
   * Touch activity (user interacting with form)
   * Updates last_activity_at to prevent premature abandonment
   */
  async updateActivity(responseId) {
    try {
      await SurveyResponse.update(
        { last_activity_at: new Date() },
        { where: { id: responseId } }
      );
    } catch (error) {
      logger.error('[ResponseLifecycle] Error updating activity:', error.message);
      // Don't throw - activity tracking is not critical
    }
  }

  /**
   * Complete a response (user submitted successfully)
   * Updates status to 'completed' and sets completed_at
   */
  async completeResponse(responseId) {
    try {
      const response = await SurveyResponse.update(
        {
          status: 'completed',
          completed_at: new Date(),
          last_activity_at: new Date()
        },
        { where: { id: responseId }, returning: true }
      );

      logger.info(`[ResponseLifecycle] Completed response ${responseId}`);
      return response[1][0]; // Return updated instance
    } catch (error) {
      logger.error('[ResponseLifecycle] Error completing response:', error.message);
      throw error;
    }
  }

  /**
   * Mark abandoned responses
   * Finds responses not touched for X minutes and marks as abandoned
   * LAZY UPDATE: called when needed, not via cron
   */
  async markAbandonedResponses(timeoutMinutes = 24 * 60) {
    try {
      const timeout = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const result = await SurveyResponse.update(
        { status: 'abandoned' },
        {
          where: {
            status: 'started',
            last_activity_at: {
              [require('sequelize').Op.lt]: timeout
            }
          }
        }
      );

      if (result[0] > 0) {
        logger.info(`[ResponseLifecycle] Marked ${result[0]} responses as abandoned`);
      }

      return result[0];
    } catch (error) {
      logger.error('[ResponseLifecycle] Error marking abandoned:', error.message);
      throw error;
    }
  }

  /**
   * Get response statistics
   * Returns counts by status (started, completed, abandoned)
   */
  async getResponseStats(surveyId) {
    try {
      const { sequelize } = require('../../../models');
      const Sequelize = require('sequelize');

      // First, mark any abandoned responses
      await this.markAbandonedResponses();

      const stats = await SurveyResponse.findAll({
        attributes: [
          'status',
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        where: { survey_id: surveyId },
        group: ['status'],
        raw: true
      });

      return {
        started: parseInt(stats.find(s => s.status === 'started')?.count || 0),
        completed: parseInt(stats.find(s => s.status === 'completed')?.count || 0),
        abandoned: parseInt(stats.find(s => s.status === 'abandoned')?.count || 0),
        total: stats.reduce((sum, s) => sum + parseInt(s.count), 0)
      };
    } catch (error) {
      logger.error('[ResponseLifecycle] Error getting stats:', error.message);
      throw error;
    }
  }

  /**
   * Get response completion rate
   */
  async getCompletionRate(surveyId) {
    try {
      const stats = await this.getResponseStats(surveyId);

      if (stats.total === 0) {
        return { rate: 0, completed: 0, total: 0 };
      }

      return {
        rate: (stats.completed / stats.total) * 100,
        completed: stats.completed,
        total: stats.total
      };
    } catch (error) {
      logger.error('[ResponseLifecycle] Error getting completion rate:', error.message);
      throw error;
    }
  }
}

module.exports = new ResponseLifecycleService();
