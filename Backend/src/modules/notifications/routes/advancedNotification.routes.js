// src/modules/notifications/routes/advancedNotification.routes.js
const express = require('express');
const router = express.Router();
const AdvancedNotificationService = require('../service/advancedNotification.service');
const SocketService = require('../../../services/socketService');
const { authenticate } = require('../../../middleware/auth.middleware');
const logger = require('../../../utils/logger');

// Initialize services
const socketService = new SocketService();
const advancedNotificationService = new AdvancedNotificationService(socketService);

/**
 * Send workspace invitation notification
 * POST /api/notifications/workspace-invite
 */
router.post('/workspace-invite', authenticate, async (req, res) => {
  try {
    const { workspaceId, invitedUserId, role } = req.body;
    const inviterUserId = req.user.id;

    if (!workspaceId || !invitedUserId || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: workspaceId, invitedUserId, role'
      });
    }

    const notification = await advancedNotificationService.sendEventNotification('WORKSPACE_INVITE', {
      workspaceId,
      invitedUserId,
      inviterUserId,
      role
    });

    res.status(201).json({
      success: true,
      message: 'Workspace invitation sent successfully',
      data: { notification }
    });

  } catch (error) {
    logger.error('❌ Failed to send workspace invitation:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send survey response notification
 * POST /api/notifications/survey-response
 */
router.post('/survey-response', authenticate, async (req, res) => {
  try {
    const { surveyId, respondentId, workspaceId } = req.body;

    if (!surveyId || !respondentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: surveyId, respondentId'
      });
    }

    const notifications = await advancedNotificationService.sendEventNotification('SURVEY_RESPONSE', {
      surveyId,
      respondentId,
      workspaceId
    });

    res.status(201).json({
      success: true,
      message: 'Survey response notifications sent',
      data: {
        notifications: Array.isArray(notifications) ? notifications : [notifications],
        grouped: notifications === null ? true : false
      }
    });

  } catch (error) {
    logger.error('❌ Failed to send survey response notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send AI analysis completed notification
 * POST /api/notifications/analysis-completed
 */
router.post('/analysis-completed', authenticate, async (req, res) => {
  try {
    const { analysisId, surveyId, workspaceId } = req.body;

    if (!analysisId || !surveyId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: analysisId, surveyId'
      });
    }

    const notifications = await advancedNotificationService.sendEventNotification('ANALYSIS_COMPLETED', {
      analysisId,
      surveyId,
      workspaceId
    });

    res.status(201).json({
      success: true,
      message: 'AI analysis completion notifications sent',
      data: { notifications }
    });

  } catch (error) {
    logger.error('❌ Failed to send analysis completion notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send role request notification
 * POST /api/notifications/role-request
 */
router.post('/role-request', authenticate, async (req, res) => {
  try {
    const { workspaceId, requestedRole, currentRole } = req.body;
    const requesterId = req.user.id;

    if (!workspaceId || !requestedRole || !currentRole) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: workspaceId, requestedRole, currentRole'
      });
    }

    const notifications = await advancedNotificationService.sendEventNotification('ROLE_REQUEST', {
      workspaceId,
      requesterId,
      requestedRole,
      currentRole
    });

    res.status(201).json({
      success: true,
      message: 'Role request notifications sent to workspace owners',
      data: { notifications }
    });

  } catch (error) {
    logger.error('❌ Failed to send role request notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send system alert notification (user kicked)
 * POST /api/notifications/system-alert
 */
router.post('/system-alert', authenticate, async (req, res) => {
  try {
    const { userId, workspaceId, reason } = req.body;
    const kickedBy = req.user.id;

    if (!userId || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, workspaceId'
      });
    }

    const notification = await advancedNotificationService.sendEventNotification('SYSTEM_ALERT', {
      userId,
      workspaceId,
      reason,
      kickedBy
    });

    res.status(201).json({
      success: true,
      message: 'System alert sent and access revoked',
      data: { notification }
    });

  } catch (error) {
    logger.error('❌ Failed to send system alert:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send deadline reminder notification
 * POST /api/notifications/deadline-reminder
 */
router.post('/deadline-reminder', authenticate, async (req, res) => {
  try {
    const { surveyId, workspaceId, deadline, hoursRemaining } = req.body;

    if (!surveyId || !deadline || !hoursRemaining) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: surveyId, deadline, hoursRemaining'
      });
    }

    const notifications = await advancedNotificationService.sendEventNotification('DEADLINE_REMINDER', {
      surveyId,
      workspaceId,
      deadline,
      hoursRemaining: parseInt(hoursRemaining)
    });

    res.status(201).json({
      success: true,
      message: 'Deadline reminder notifications sent',
      data: { notifications }
    });

  } catch (error) {
    logger.error('❌ Failed to send deadline reminder:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Handle notification actions (approve, reject, etc.)
 * POST /api/notifications/:id/action
 */
router.post('/:id/action', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const { action } = req.body;
    const userId = req.user.id;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    const { Notification } = require('../../../models');
    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to perform this action'
      });
    }

    let result;
    switch (notification.type) {
      case 'role_request':
        result = await handleRoleRequestAction(notification, action, userId);
        break;
      case 'workspace_invite':
        result = await handleWorkspaceInviteAction(notification, action, userId);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Action not supported for this notification type'
        });
    }

    // Mark notification as read
    await notification.update({
      is_read: true,
      metadata: {
        ...notification.metadata,
        actionTaken: action,
        actionTimestamp: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: `Action ${action} completed successfully`,
      data: result
    });

  } catch (error) {
    logger.error('❌ Failed to handle notification action:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get user notifications with filtering
 * GET /api/notifications
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, unreadOnly, limit = 20, offset = 0 } = req.query;

    const { Notification } = require('../../../models');
    const whereClause = { user_id: userId };

    if (type) whereClause.type = type;
    if (unreadOnly === 'true') whereClause.is_read = false;

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: require('../../../models').User,
          as: 'Actor',
          attributes: ['id', 'name', 'email', 'role']
        }
      ]
    });

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications.rows,
        total: notifications.count,
        unreadCount: await Notification.count({
          where: { user_id: userId, is_read: false }
        })
      }
    });

  } catch (error) {
    logger.error('❌ Failed to get notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Mark notification as read
 * PUT /api/notifications/:id/read
 */
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;

    const { Notification } = require('../../../models');
    const notification = await Notification.findOne({
      where: { id: notificationId, user_id: userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.update({ is_read: true });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    logger.error('❌ Failed to mark notification as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
router.put('/read-all', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { Notification } = require('../../../models');
    const result = await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );

    res.status(200).json({
      success: true,
      message: `Marked ${result[0]} notifications as read`
    });

  } catch (error) {
    logger.error('❌ Failed to mark all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Helper functions for handling notification actions
async function handleRoleRequestAction(notification, action, userId) {
  const { WorkspaceMember } = require('../../../models');
  const metadata = notification.metadata;
  const requesterId = metadata.requesterId;
  const workspaceId = notification.related_workspace_id;

  if (action === 'approve_role_request') {
    // Update workspace member role
    await WorkspaceMember.update(
      { role: metadata.requestedRole },
      {
        where: {
          workspace_id: workspaceId,
          user_id: requesterId
        }
      }
    );

    // Send confirmation notification to requester
    await advancedNotificationService.sendEventNotification('ROLE_CHANGE_APPROVED', {
      userId: requesterId,
      workspaceId,
      newRole: metadata.requestedRole,
      approvedBy: userId
    });

    logger.info(`✅ Role request approved: User ${requesterId} -> ${metadata.requestedRole} in workspace ${workspaceId}`);

    return { approved: true, newRole: metadata.requestedRole };

  } else if (action === 'reject_role_request') {
    logger.info(`❌ Role request rejected: User ${requesterId} in workspace ${workspaceId}`);

    return { approved: false };
  }
}

async function handleWorkspaceInviteAction(notification, action, userId) {
  const workspaceId = notification.related_workspace_id;

  if (action === 'accept_workspace_invite') {
    const { WorkspaceMember } = require('../../../models');

    // Add user to workspace
    await WorkspaceMember.create({
      workspace_id: workspaceId,
      user_id: userId,
      role: notification.metadata.role || 'member'
    });

    logger.info(`✅ Workspace invitation accepted: User ${userId} joined workspace ${workspaceId}`);

    return { accepted: true, workspaceId };

  } else if (action === 'reject_workspace_invite') {
    logger.info(`❌ Workspace invitation rejected: User ${userId} for workspace ${workspaceId}`);

    return { accepted: false };
  }
}

module.exports = router;