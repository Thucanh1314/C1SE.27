// src/modules/collectors/service/collector.service.js
const { Survey, SurveyCollector, SurveyResponse, WorkspaceMember } = require('../../../models');
const { Op } = require('sequelize');
const crypto = require('crypto');

class CollectorService {
  /**
   * Generate unique token for collector
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Check if user has access to survey (Owner, Admin, or Workspace Member)
   */
  /**
   * Check if user has access to survey (Owner, Admin, or Workspace Member)
   */
  async checkAccess(survey, user) {
    // Admin has access to everything
    if (user.role === 'admin') return true;

    // Use unified access service
    // This handles: Creator, Workspace Member, and Direct Access Grants
    const surveyAccessService = require('../../surveys/service/surveyAccess.service');
    return await surveyAccessService.hasAccess(survey.id, user.id, 'view');
  }

  /**
   * Get collectors for a survey
   */
  async getCollectorsBySurvey(surveyId, user) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Enhanced access check for respondents
    let hasAccess = false;

    // Admin always has access
    if (user.role === 'admin') {
      hasAccess = true;
    }
    // Survey creator has access
    else if (survey.created_by === user.id) {
      hasAccess = true;
    }
    // Check if user is a respondent trying to start the survey
    else if (user.role === 'user') {
      // For internal surveys, check workspace membership
      if (survey.access_type === 'internal' && survey.workspace_id) {
        const workspaceMember = await WorkspaceMember.findOne({
          where: {
            workspace_id: survey.workspace_id,
            user_id: user.id,
            is_active: true
          }
        });
        hasAccess = !!workspaceMember;
      }
      // For private surveys, check if user has an invitation
      else if (survey.access_type === 'private') {
        const { SurveyInvite } = require('../../../models');
        const { User } = require('../../../models');

        // Get user's email
        const userRecord = await User.findByPk(user.id);
        if (userRecord) {
          const invitation = await SurveyInvite.findOne({
            where: {
              survey_id: surveyId,
              email: userRecord.email,
              status: 'pending'
            }
          });
          hasAccess = !!invitation;
        }
      }
      // For public surveys, everyone has access
      else if (survey.access_type === 'public' || survey.access_type === 'public_with_login') {
        hasAccess = true;
      }
    }
    // For creators, use the unified access service
    else {
      const surveyAccessService = require('../../surveys/service/surveyAccess.service');
      hasAccess = await surveyAccessService.hasAccess(survey.id, user.id, 'view');
    }

    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const collectors = await SurveyCollector.findAll({
      where: { survey_id: surveyId },
      order: [['created_at', 'DESC']]
    });

    // Get dynamic counts for accuracy (in case cache is out of sync)
    // and map to response format
    const mappedCollectors = await Promise.all(collectors.map(async c => {
      const realCount = await SurveyResponse.count({
        where: {
          collector_id: c.id,
          status: 'completed'
        }
      });

      return {
        id: c.id,
        type: c.collector_type,
        name: c.name,
        token: c.token,
        url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collector/${c.token}`,
        is_active: c.is_active,
        allow_multiple_responses: c.allow_multiple_responses,
        response_count: realCount, // Use real-time count
        created_at: c.created_at
      };
    }));

    return {
      survey_id: surveyId,
      collectors: mappedCollectors
    };
  }

  /**
   * Create collector
   */
  async createCollector(surveyId, collectorData, user) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check access
    const hasAccess = await this.checkAccess(survey, user);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const {
      collector_type = 'web_link',
      name,
      allow_multiple_responses = false
    } = collectorData;

    // Generate unique token
    const token = this.generateToken();

    // Create collector
    const collector = await SurveyCollector.create({
      survey_id: surveyId,
      collector_type,
      token,
      name: name || `${collector_type} collector`,
      is_active: true,
      allow_multiple_responses,
      response_count: 0,
      created_by: user.id
    });

    return {
      id: collector.id,
      type: collector.collector_type,
      name: collector.name,
      token: collector.token,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collector/${collector.token}`,
      is_active: collector.is_active,
      allow_multiple_responses: collector.allow_multiple_responses,
      created_at: collector.created_at
    };
  }

  /**
   * Get collector by token (for public access)
   */
  async getCollectorByToken(token) {
    const collector = await SurveyCollector.findOne({
      where: { token },
      include: [
        {
          model: Survey,
          as: 'Survey',
          include: [
            {
              model: require('../../../models').SurveyTemplate,
              as: 'template',
              include: [
                {
                  model: require('../../../models').Question,
                  as: 'Questions',
                  include: [
                    {
                      model: require('../../../models').QuestionOption,
                      as: 'QuestionOptions'
                    },
                    {
                      model: require('../../../models').QuestionType,
                      as: 'QuestionType'
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    if (!collector) {
      throw new Error('Collector not found');
    }

    if (!collector.is_active) {
      throw new Error('This collector is no longer active');
    }

    const survey = collector.Survey;

    if (survey.status !== 'active') {
      throw new Error('This survey is not currently accepting responses');
    }

    return {
      collector: {
        id: collector.id,
        type: collector.collector_type,
        name: collector.name,
        allow_multiple_responses: collector.allow_multiple_responses
      },
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        access_type: survey.access_type,
        require_login: survey.access_type === 'public_with_login' || survey.access_type === 'internal',
        workspace_id: survey.access_type === 'internal' ? survey.workspace_id : null,
        questions: survey.template.Questions.map(q => ({
          id: q.id,
          label: q.question_text,
          type: q.QuestionType.type_name,
          required: q.required,
          display_order: q.display_order,
          options: q.QuestionOptions.map(opt => ({
            id: opt.id,
            text: opt.option_text,
            display_order: opt.display_order
          }))
        }))
      }
    };
  }

  /**
   * Update collector
   */
  async updateCollector(collectorId, updateData, user) {
    const collector = await SurveyCollector.findByPk(collectorId, {
      include: [Survey]
    });

    if (!collector) {
      throw new Error('Collector not found');
    }

    const survey = collector.Survey;

    // Check access
    const hasAccess = await this.checkAccess(survey, user);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Update allowed fields
    const allowedFields = ['name', 'is_active', 'allow_multiple_responses'];
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        collector[field] = updateData[field];
      }
    });

    await collector.save();

    return {
      id: collector.id,
      type: collector.collector_type,
      name: collector.name,
      token: collector.token,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/collector/${collector.token}`,
      is_active: collector.is_active,
      allow_multiple_responses: collector.allow_multiple_responses
    };
  }

  /**
   * Delete collector
   */
  async deleteCollector(collectorId, user) {
    const collector = await SurveyCollector.findByPk(collectorId, {
      include: [Survey]
    });

    if (!collector) {
      throw new Error('Collector not found');
    }

    const survey = collector.Survey;

    // Check access
    const hasAccess = await this.checkAccess(survey, user);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    await collector.destroy();

    return { message: 'Collector deleted successfully' };
  }

  /**
   * Increment response count
   */
  async incrementResponseCount(collectorId) {
    const collector = await SurveyCollector.findByPk(collectorId);
    if (collector) {
      collector.response_count += 1;
      await collector.save();
    }
  }
}

module.exports = new CollectorService();
