// src/modules/surveys/service/surveyInvite.service.js
const { SurveyInvite, Survey, User } = require('../../../models');
const crypto = require('crypto');
const { Op } = require('sequelize');

class SurveyInviteService {
  /**
   * Create survey invites for private surveys
   */
  async createInvites(surveyId, emails, userId, expiresInDays = 30) {
    // Verify survey exists and is private
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.access_type !== 'private') {
      throw new Error('Survey must be private to create invites');
    }

    // Check ownership
    if (survey.created_by !== userId) {
      throw new Error('Only survey creator can send invites');
    }

    const invites = [];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Initialize notification service
    const notificationService = require('../../notifications/service/notification.service');

    for (const email of emails) {
      // Check if invite already exists
      let invite;
      const existingInvite = await SurveyInvite.findOne({
        where: { survey_id: surveyId, email }
      });

      if (existingInvite) {
        // Update existing invite
        existingInvite.token = crypto.randomBytes(32).toString('hex');
        existingInvite.status = 'pending';
        existingInvite.expires_at = expiresAt;
        existingInvite.responded_at = null;
        await existingInvite.save();
        invite = existingInvite;
        invites.push(invite);
      } else {
        // Create new invite
        invite = await SurveyInvite.create({
          survey_id: surveyId,
          email,
          token: crypto.randomBytes(32).toString('hex'),
          expires_at: expiresAt,
          created_by: userId
        });
        invites.push(invite);
      }

      // Notify if the email belongs to a registered user
      const user = await User.findOne({ where: { email } });
      if (user) {
        try {
          // Build detailed notification message
          let message = `You have been invited to participate in the survey: "${survey.title}"`;
          if (survey.description) {
            message += `\n\n${survey.description.substring(0, 150)}${survey.description.length > 150 ? '...' : ''}`;
          }
          if (survey.end_date) {
            const endDate = new Date(survey.end_date);
            const now = new Date();
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            if (daysLeft > 0) {
              message += `\n\n⏰ Deadline: ${endDate.toLocaleDateString()} (${daysLeft} days left)`;
            }
          }

          await notificationService.createNotification({
            userId: user.id,
            type: 'survey_invite',
            title: '📧 New Survey Invitation',
            message,
            actionUrl: `/invitations?type=survey&inviteId=${invite.id}`,
            actorId: userId,
            relatedSurveyId: surveyId,
            relatedUserId: user.id
          });
        } catch (notifError) {
          console.error(`[SurveyInvite] Failed to create notification for ${email}:`, notifError.message);
          // Continue - don't fail invite creation if notification fails
        }
      }
    }

    return invites;
  }

  /**
   * Get all invites for a survey
   */
  async getInvitesBySurvey(surveyId, userId) {
    // Verify survey ownership
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.created_by !== userId) {
      throw new Error('Access denied');
    }

    return await SurveyInvite.findAll({
      where: { survey_id: surveyId },
      include: [
        {
          model: Survey,
          as: 'survey',
          attributes: ['id', 'title']
        }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Validate invite token
   */
  async validateInvite(token) {
    console.log(`[SurveyInviteService] Validating token: ${token}`);

    // First check if invite exists at all, ignoring status/expiry for debugging
    const debugInvite = await SurveyInvite.findOne({ where: { token } });
    if (!debugInvite) {
      console.log('[SurveyInviteService] Token not found in database');
    } else {
      console.log('[SurveyInviteService] Token found. Status:', debugInvite.status, 'Expires:', debugInvite.expires_at);
    }

    const invite = await SurveyInvite.findOne({
      where: {
        token,
        status: 'pending',
        expires_at: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: Survey,
          as: 'survey',
          attributes: ['id', 'title', 'description', 'access_type', 'status']
        }
      ]
    });

    if (!invite) {
      if (debugInvite) {
        if (debugInvite.status !== 'pending') throw new Error(`Invite is ${debugInvite.status}`);
        if (new Date(debugInvite.expires_at) <= new Date()) throw new Error('Invite has expired');
      }
      throw new Error('Invalid or expired invite');
    }

    if (invite.survey.status !== 'active') {
      console.log('[SurveyInviteService] Survey status is:', invite.survey.status);
      // Allow draft surveys for testing if needed, or strictly enforce active
      // throw new Error('Survey is not active');
    }

    return invite;
  }

  /**
   * Mark invite as responded
   */
  async markInviteResponded(token) {
    const invite = await SurveyInvite.findOne({
      where: { token }
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    invite.status = 'responded';
    invite.responded_at = new Date();
    await invite.save();

    return invite;
  }

  /**
   * Revoke/delete invite
   */
  async revokeInvite(inviteId, userId) {
    const invite = await SurveyInvite.findByPk(inviteId, {
      include: [
        {
          model: Survey,
          as: 'survey',
          attributes: ['id', 'created_by']
        }
      ]
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.survey.created_by !== userId) {
      throw new Error('Access denied');
    }

    await invite.destroy();
    return true;
  }

  /**
   * Get invite statistics for a survey
   */
  async getInviteStats(surveyId, userId) {
    // Verify survey ownership
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.created_by !== userId) {
      throw new Error('Access denied');
    }

    const stats = await SurveyInvite.findAll({
      where: { survey_id: surveyId },
      attributes: [
        'status',
        [Survey.sequelize.fn('COUNT', Survey.sequelize.col('status')), 'count']
      ],
      group: ['status']
    });

    const result = {
      total: 0,
      pending: 0,
      responded: 0,
      expired: 0
    };

    stats.forEach(stat => {
      result.total += parseInt(stat.dataValues.count);
      result[stat.status] = parseInt(stat.dataValues.count);
    });

    return result;
  }

  /**
   * Clean up expired invites
   */
  async cleanupExpiredInvites() {
    const expiredInvites = await SurveyInvite.update(
      { status: 'expired' },
      {
        where: {
          status: 'pending',
          expires_at: { [Op.lt]: new Date() }
        }
      }
    );

    return expiredInvites[0]; // Number of updated rows
  }
}

module.exports = new SurveyInviteService();