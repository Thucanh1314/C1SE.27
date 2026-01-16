// src/modules/surveys/service/surveyAccess.service.js
const { SurveyAccess, Survey, User } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

class SurveyAccessService {
  /**
   * Helper to verify if user can manage (edit/delete/publish/manage-access) a survey
   */
  async _checkManagementAccess(survey, userId, userRole, action = 'manage access for') {
    if (userRole === 'admin') return true;

    const { WorkspaceMember } = require('../../../models');

    let hasAccess = false;
    if (survey.workspace_id) {
      const membership = await WorkspaceMember.findOne({
        where: { workspace_id: survey.workspace_id, user_id: userId }
      });
      if (membership && ['owner', 'collaborator'].includes(membership.role)) {
        hasAccess = true;
      }
    }

    if (survey.created_by === userId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      throw new Error(`Access denied. You do not have permission to ${action} this survey.`);
    }
    return true;
  }

  /**
   * Grant access to a survey for a user
   */
  async grantAccess(surveyId, userId, accessData, grantedBy) {
    try {
      const { access_type = 'respond', expires_at = null, notes = null } = accessData;

      // Check if survey exists
      const survey = await Survey.findByPk(surveyId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      // Check if grantor has permission
      const { User: UserModel } = require('../../../models');
      const grantorUser = await UserModel.findByPk(grantedBy);
      await this._checkManagementAccess(survey, grantedBy, grantorUser.role);

      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if access already exists
      const existingAccess = await SurveyAccess.findOne({
        where: { survey_id: surveyId, user_id: userId }
      });

      if (existingAccess) {
        // Update existing access
        await existingAccess.update({
          access_type,
          expires_at,
          notes,
          granted_by: grantedBy,
          is_active: true
        });
        return existingAccess;
      } else {
        // Create new access
        const newAccess = await SurveyAccess.create({
          survey_id: surveyId,
          user_id: userId,
          access_type,
          granted_by: grantedBy,
          expires_at,
          notes,
          is_active: true
        });
        return newAccess;
      }
    } catch (error) {
      logger.error('Grant survey access error:', error);
      throw error;
    }
  }

  /**
   * Revoke access to a survey for a user
   */
  async revokeAccess(surveyId, userId, revokingUserId) {
    try {
      const survey = await Survey.findByPk(surveyId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      // Check if revoker has permission
      const { User: UserModel } = require('../../../models');
      const revokerUser = await UserModel.findByPk(revokingUserId);
      await this._checkManagementAccess(survey, revokingUserId, revokerUser.role, 'revoke access for');

      const access = await SurveyAccess.findOne({
        where: { survey_id: surveyId, user_id: userId }
      });

      if (!access) {
        throw new Error('Access grant not found');
      }

      // Check if current user has permission (Note: this method needs user context, adding it to arguments)
      // Wait, let's just make it simple for now or update the signature.
      // For now, I'll update the signature of revokeAccess to include user context.

      await access.update({ is_active: false });
      return { success: true };
    } catch (error) {
      logger.error('Revoke survey access error:', error);
      throw error;
    }
  }

  /**
   * Get access grants for a survey
   */
  async getSurveyAccessGrants(surveyId, currentUser = null) {
    try {
      const survey = await Survey.findByPk(surveyId);
      if (!survey) {
        throw new Error('Survey not found');
      }

      // If user context provided, check permission
      if (currentUser) {
        await this._checkManagementAccess(survey, currentUser.id, currentUser.role, 'view access for');
      }

      const accessGrants = await SurveyAccess.findAll({
        where: {
          survey_id: surveyId,
          is_active: true,
          [Op.or]: [
            { expires_at: null },
            { expires_at: { [Op.gt]: new Date() } }
          ]
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'full_name']
          },
          {
            model: User,
            as: 'grantor',
            attributes: ['id', 'username', 'full_name']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return accessGrants;
    } catch (error) {
      logger.error('Get survey access grants error:', error);
      throw error;
    }
  }

  /**
   * Get user access for a survey
   */
  async getUserSurveyAccess(surveyId, userId) {
    try {
      const access = await SurveyAccess.findOne({
        where: {
          survey_id: surveyId,
          user_id: userId,
          is_active: true,
          [Op.or]: [
            { expires_at: null },
            { expires_at: { [Op.gt]: new Date() } }
          ]
        }
      });

      return access;
    } catch (error) {
      logger.error('Get user survey access error:', error);
      throw error;
    }
  }

  /**
   * Check if user has specific access to a survey
   */
  async hasAccess(surveyId, userId, requiredAccessType = 'respond') {
    try {
      const survey = await Survey.findByPk(surveyId);
      if (!survey) {
        return false;
      }

      // Check if user is creator
      if (survey.created_by === userId) {
        return true;
      }

      // Check access grants
      const access = await this.getUserSurveyAccess(surveyId, userId);
      if (access) {
        // Check access type hierarchy: full > view > respond
        const accessHierarchy = { 'full': 3, 'view': 2, 'respond': 1 };
        const userAccessLevel = accessHierarchy[access.access_type] || 0;
        const requiredAccessLevel = accessHierarchy[requiredAccessType] || 0;

        if (userAccessLevel >= requiredAccessLevel) return true;
      }

      // Check workspace membership for internal surveys
      if (survey.workspace_id) {
        const { WorkspaceMember } = require('../../../models');
        const member = await WorkspaceMember.findOne({
          where: {
            workspace_id: survey.workspace_id,
            user_id: userId
          }
        });

        if (member) {
          // Workspace members have at least 'view' access
          const accessHierarchy = { 'full': 3, 'view': 2, 'respond': 1 };
          const memberAccessLevel = 2; // 'view'
          const requiredAccessLevel = accessHierarchy[requiredAccessType] || 0;

          if (memberAccessLevel >= requiredAccessLevel) return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Check survey access error:', error);
      return false;
    }
  }

  /**
   * Get surveys user has access to
   */
  async getUserAccessibleSurveys(userId) {
    try {
      const accessGrants = await SurveyAccess.findAll({
        where: {
          user_id: userId,
          is_active: true,
          [Op.or]: [
            { expires_at: null },
            { expires_at: { [Op.gt]: new Date() } }
          ]
        },
        include: [
          {
            model: Survey,
            as: 'survey',
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'username', 'full_name']
              }
            ]
          }
        ],
        order: [['created_at', 'DESC']]
      });

      return accessGrants.map(grant => ({
        ...grant.survey.toJSON(),
        access_type: grant.access_type,
        access_granted_at: grant.created_at
      }));
    } catch (error) {
      logger.error('Get user accessible surveys error:', error);
      throw error;
    }
  }
}

module.exports = new SurveyAccessService();