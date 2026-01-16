// src/modules/notifications/service/advancedNotification.service.js
const { Notification, User, Survey, Workspace, WorkspaceMember } = require('../../../models');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

// Notification Event Types with configurations based on the correlation table
const NOTIFICATION_EVENTS = {
  WORKSPACE_INVITE: {
    type: 'workspace_invite',
    priority: 'normal',
    groupable: false,
    realTime: true,
    recipients: ['user', 'creator'],
    contexts: ['owner', 'collaborator', 'member', 'viewer'],
    actions: {
      primary: 'accept_workspace_invite',
      secondary: 'reject_workspace_invite',
      redirect: '/workspace/join/{workspaceId}'
    },
    specialLogic: 'unlock_workspace_menu_for_users'
  },
  SURVEY_RESPONSE: {
    type: 'survey_response',
    priority: 'normal',
    groupable: true,
    realTime: false,
    recipients: ['creator', 'user'],
    contexts: ['owner', 'collaborator'],
    actions: {
      primary: 'view_analytics',
      redirect: '/analytics/{surveyId}'
    },
    grouping: {
      interval: 300000, // 5 minutes
      maxCount: 10,
      template: '{count} phản hồi mới từ khảo sát "{surveyTitle}"'
    }
  },
  ANALYSIS_COMPLETED: {
    type: 'analysis_completed',
    priority: 'high',
    groupable: false,
    realTime: true,
    recipients: ['creator', 'user'],
    contexts: ['owner', 'collaborator', 'viewer'],
    actions: {
      primary: 'view_gemini_insights',
      redirect: '/insights/gemini/{analysisId}'
    },
    specialLogic: 'high_priority_notification'
  },
  ROLE_REQUEST: {
    type: 'role_request',
    priority: 'high',
    groupable: false,
    realTime: true,
    recipients: ['creator'],
    contexts: ['owner'],
    actions: {
      primary: 'approve_role_request',
      secondary: 'reject_role_request',
      redirect: '/workspace/{workspaceId}/manage/roles'
    },
    interactive: true,
    specialLogic: 'only_workspace_owner'
  },
  SYSTEM_ALERT: {
    type: 'system_alert',
    priority: 'critical',
    groupable: false,
    realTime: true,
    recipients: ['user', 'creator'],
    contexts: ['removed'],
    actions: {
      socketEvent: 'revoke_workspace_access',
      redirect: '/dashboard'
    },
    forceRedirect: true,
    specialLogic: 'real_time_access_revocation'
  },
  DEADLINE_REMINDER: {
    type: 'deadline_reminder',
    priority: 'normal',
    groupable: false,
    realTime: false,
    recipients: ['user'],
    contexts: ['member'],
    actions: {
      primary: 'complete_survey',
      redirect: '/survey/{surveyId}/respond'
    }
  }
};

class AdvancedNotificationService {
  constructor(socketService = null) {
    this.socketService = socketService;
    this.groupingBuffer = new Map(); // For grouping notifications
  }

  /**
   * Main method to send event-based notifications
   */
  async sendEventNotification(eventType, data) {
    try {
      const eventConfig = NOTIFICATION_EVENTS[eventType];
      if (!eventConfig) {
        throw new Error(`Unknown notification event type: ${eventType}`);
      }

      logger.info(`📨 Processing notification event: ${eventType}`, { data });

      switch (eventType) {
        case 'WORKSPACE_INVITE':
          return await this._handleWorkspaceInvite(eventConfig, data);
        case 'SURVEY_RESPONSE':
          return await this._handleSurveyResponse(eventConfig, data);
        case 'ANALYSIS_COMPLETED':
          return await this._handleAnalysisCompleted(eventConfig, data);
        case 'ROLE_REQUEST':
          return await this._handleRoleRequest(eventConfig, data);
        case 'SYSTEM_ALERT':
          return await this._handleSystemAlert(eventConfig, data);
        case 'DEADLINE_REMINDER':
          return await this._handleDeadlineReminder(eventConfig, data);
        default:
          throw new Error(`No handler for event type: ${eventType}`);
      }
    } catch (error) {
      logger.error('❌ Failed to send event notification:', error);
      throw error;
    }
  }

  /**
   * Handle workspace invitation notifications
   * Event: Được mời vào nhóm
   * Recipients: User hoặc Creator
   * Context: Tất cả các role
   * Action: Gửi link chấp nhận. Nếu là User, mở quyền xem menu Workspace ở Sidebar
   */
  async _handleWorkspaceInvite(config, data) {
    const { workspaceId, invitedUserId, inviterUserId, role } = data;

    // Get workspace and user info
    const workspace = await Workspace.findByPk(workspaceId);
    const invitedUser = await User.findByPk(invitedUserId);
    const inviter = await User.findByPk(inviterUserId);

    if (!workspace || !invitedUser || !inviter) {
      throw new Error('Missing required entities for workspace invite');
    }

    const actionUrl = this._buildActionUrl(config.actions.redirect, { workspaceId });

    const notification = await this._createNotification({
      userId: invitedUserId,
      type: config.type,
      title: `Mời tham gia Workspace`,
      message: `${inviter.name} đã mời bạn tham gia workspace "${workspace.name}" với vai trò ${role}`,
      actionUrl,
      priority: config.priority,
      workspaceId,
      actorId: inviterUserId,
      metadata: {
        actions: {
          primary: { action: 'accept_invite', label: 'Chấp nhận' },
          secondary: { action: 'decline_invite', label: 'Từ chối' }
        },
        unlockWorkspaceMenu: invitedUser.role === 'user' // Special logic for Users
      }
    });

    // Real-time notification
    if (config.realTime && this.socketService) {
      this.socketService.notifyUser(invitedUserId, 'workspace_invite', {
        notification,
        unlockWorkspaceMenu: invitedUser.role === 'user'
      });
    }

    return notification;
  }

  /**
   * Handle new survey response notifications
   * Event: Có phản hồi mới
   * Recipients: Creator hoặc User
   * Context: Owner hoặc Collaborator
   * Action: Gom nhóm thông báo để tránh spam. Dẫn đến trang Analytics
   */
  async _handleSurveyResponse(config, data) {
    const { surveyId, respondentId, workspaceId } = data;

    const survey = await Survey.findByPk(surveyId, { include: [User, Workspace] });
    if (!survey) throw new Error('Survey not found');

    // Get eligible recipients (Creator/User with Owner/Collaborator roles)
    const recipients = await this._getWorkspaceRecipients(workspaceId, config.recipients, config.contexts);

    const actionUrl = this._buildActionUrl(config.actions.redirect, { surveyId });

    // Group notifications to avoid spam
    const groupKey = `survey_response_${surveyId}`;

    if (config.groupable && this._shouldGroup(groupKey)) {
      return await this._addToGroup(groupKey, {
        surveyId,
        respondentId,
        recipients,
        actionUrl,
        config
      });
    }

    // Send individual notifications to each recipient
    const notifications = [];
    for (const recipient of recipients) {
      const notification = await this._createNotification({
        userId: recipient.userId,
        type: config.type,
        title: 'Phản hồi khảo sát mới',
        message: `Có phản hồi mới cho khảo sát "${survey.title}"`,
        actionUrl,
        priority: config.priority,
        surveyId,
        workspaceId,
        metadata: {
          actions: {
            primary: { action: 'view_analytics', label: 'Xem phân tích' }
          }
        }
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Handle AI analysis completed notifications
   * Event: AI phân tích xong
   * Recipients: Creator hoặc User
   * Context: Owner, Collaborator, Viewer
   * Action: Thông báo ưu tiên cao. Dẫn thẳng đến Insight của Gemini
   */
  async _handleAnalysisCompleted(config, data) {
    const { analysisId, surveyId, workspaceId } = data;

    const survey = await Survey.findByPk(surveyId);
    if (!survey) throw new Error('Survey not found');

    // Get recipients with broader context (includes viewers)
    const recipients = await this._getWorkspaceRecipients(workspaceId, config.recipients, config.contexts);

    const actionUrl = this._buildActionUrl(config.actions.redirect, { analysisId });

    const notifications = [];
    for (const recipient of recipients) {
      const notification = await this._createNotification({
        userId: recipient.userId,
        type: config.type,
        title: '🔍 Phân tích AI hoàn tất',
        message: `Gemini đã hoàn thành phân tích cho khảo sát "${survey.title}"`,
        actionUrl,
        priority: config.priority, // High priority
        surveyId,
        workspaceId,
        metadata: {
          analysisId,
          actions: {
            primary: { action: 'view_insights', label: 'Xem Insight' }
          },
          highPriority: true
        }
      });
      notifications.push(notification);

      // Real-time high priority notification
      if (config.realTime && this.socketService) {
        this.socketService.notifyUser(recipient.userId, 'analysis_completed', {
          notification,
          priority: 'high'
        });
      }
    }

    return notifications;
  }

  /**
   * Handle role change request notifications
   * Event: Yêu cầu đổi Role
   * Recipients: Creator
   * Context: Owner
   * Action: Chỉ gửi cho Chủ Workspace. Chứa nút "Duyệt" hoặc "Từ chối"
   */
  async _handleRoleRequest(config, data) {
    const { workspaceId, requesterId, requestedRole, currentRole } = data;

    const workspace = await Workspace.findByPk(workspaceId);
    const requester = await User.findByPk(requesterId);

    if (!workspace || !requester) {
      throw new Error('Missing required entities for role request');
    }

    // Get workspace owners only (special logic)
    const owners = await WorkspaceMember.findAll({
      where: { workspace_id: workspaceId, role: 'owner' },
      include: [{
        model: User,
        where: { role: 'creator' } // Only creators can be owners who approve
      }]
    });

    if (owners.length === 0) {
      throw new Error('No eligible owners found to handle role request');
    }

    const actionUrl = this._buildActionUrl(config.actions.redirect, { workspaceId });

    const notifications = [];
    for (const owner of owners) {
      const notification = await this._createNotification({
        userId: owner.User.id,
        type: config.type,
        title: 'Yêu cầu thay đổi vai trò',
        message: `${requester.name} muốn thay đổi vai trò từ ${currentRole} thành ${requestedRole} trong workspace "${workspace.name}"`,
        actionUrl,
        priority: config.priority,
        workspaceId,
        actorId: requesterId,
        metadata: {
          requesterId,
          requestedRole,
          currentRole,
          actions: {
            primary: { action: 'approve_role_request', label: 'Duyệt' },
            secondary: { action: 'reject_role_request', label: 'Từ chối' }
          },
          interactive: true
        }
      });
      notifications.push(notification);

      // Real-time notification with interactive buttons
      if (config.realTime && this.socketService) {
        this.socketService.notifyUser(owner.User.id, 'role_request', {
          notification,
          interactive: true,
          actions: ['approve', 'reject']
        });
      }
    }

    return notifications;
  }

  /**
   * Handle system alert notifications (user kicked)
   * Event: Bị xóa (Kick)
   * Recipients: User hoặc Creator
   * Context: (Đã bị xóa)
   * Action: Thu hồi quyền truy cập real-time qua Socket.IO. Đẩy về trang chủ
   */
  async _handleSystemAlert(config, data) {
    const { userId, workspaceId, reason, kickedBy } = data;

    const user = await User.findByPk(userId);
    const workspace = await Workspace.findByPk(workspaceId);
    const kicker = kickedBy ? await User.findByPk(kickedBy) : null;

    if (!user || !workspace) {
      throw new Error('Missing required entities for system alert');
    }

    const actionUrl = config.actions.redirect; // Direct to dashboard

    const notification = await this._createNotification({
      userId,
      type: config.type,
      title: '⚠️ Thông báo hệ thống',
      message: `Bạn đã bị xóa khỏi workspace "${workspace.name}". ${reason || ''}`,
      actionUrl,
      priority: config.priority,
      workspaceId,
      actorId: kickedBy,
      metadata: {
        reason,
        kickedBy: kicker?.name,
        forceRedirect: true,
        revokeAccess: true
      }
    });

    // Critical real-time action: revoke access and force redirect
    if (this.socketService) {
      this.socketService.revokeWorkspaceAccess(userId, workspaceId);
      this.socketService.forceRedirect(userId, '/dashboard');

      this.socketService.notifyUser(userId, 'system_alert', {
        notification,
        forceRedirect: '/dashboard',
        revokeWorkspaceAccess: workspaceId
      });
    }

    return notification;
  }

  /**
   * Handle survey deadline reminders
   * Event: Khảo sát sắp hết hạn
   * Recipients: User
   * Context: Member
   * Action: Nhắc nhở trả lời. Dẫn đến trang làm khảo sát
   */
  async _handleDeadlineReminder(config, data) {
    const { surveyId, workspaceId, deadline, hoursRemaining } = data;

    const survey = await Survey.findByPk(surveyId);
    if (!survey) throw new Error('Survey not found');

    // Get workspace members with User system role and Member context
    const members = await WorkspaceMember.findAll({
      where: {
        workspace_id: workspaceId,
        role: 'member'
      },
      include: [{
        model: User,
        where: { role: 'user' } // Only users get deadline reminders
      }]
    });

    const actionUrl = this._buildActionUrl(config.actions.redirect, { surveyId });

    const notifications = [];
    for (const member of members) {
      const notification = await this._createNotification({
        userId: member.User.id,
        type: config.type,
        title: '⏰ Khảo sát sắp hết hạn',
        message: `Khảo sát "${survey.title}" sẽ kết thúc trong ${hoursRemaining} giờ. Hãy hoàn thành phản hồi của bạn!`,
        actionUrl,
        priority: config.priority,
        surveyId,
        workspaceId,
        metadata: {
          deadline,
          hoursRemaining,
          actions: {
            primary: { action: 'complete_survey', label: 'Làm khảo sát' }
          }
        }
      });
      notifications.push(notification);
    }

    return notifications;
  }

  /**
   * Get workspace recipients based on role criteria
   */
  async _getWorkspaceRecipients(workspaceId, systemRoles, workspaceRoles) {
    const recipients = await WorkspaceMember.findAll({
      where: {
        workspace_id: workspaceId,
        role: { [Op.in]: workspaceRoles }
      },
      include: [{
        model: User,
        where: { role: { [Op.in]: systemRoles } }
      }]
    });

    return recipients.map(member => ({
      userId: member.User.id,
      systemRole: member.User.role,
      workspaceRole: member.role
    }));
  }

  /**
   * Create notification record
   */
  async _createNotification(data) {
    return await Notification.create({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      action_url: data.actionUrl,
      priority: data.priority || 'normal',
      actor_id: data.actorId || null,
      related_survey_id: data.surveyId || null,
      related_workspace_id: data.workspaceId || null,
      related_response_id: data.responseId || null,
      related_user_id: data.relatedUserId || null,
      metadata: data.metadata || {},
      is_read: false
    });
  }

  /**
   * Build action URL with parameters
   */
  _buildActionUrl(template, params) {
    let url = template;
    Object.keys(params).forEach(key => {
      url = url.replace(`{${key}}`, params[key]);
    });
    return url;
  }

  /**
   * Grouping logic for notifications
   */
  _shouldGroup(groupKey) {
    const lastSent = this.groupingBuffer.get(groupKey);
    if (!lastSent) return false;

    return (Date.now() - lastSent.timestamp) < NOTIFICATION_EVENTS.SURVEY_RESPONSE.grouping.interval;
  }

  async _addToGroup(groupKey, data) {
    // Add to grouping buffer
    if (!this.groupingBuffer.has(groupKey)) {
      this.groupingBuffer.set(groupKey, {
        count: 1,
        data: [data],
        timestamp: Date.now()
      });
    } else {
      const group = this.groupingBuffer.get(groupKey);
      group.count++;
      group.data.push(data);
    }

    // Check if should flush group
    const group = this.groupingBuffer.get(groupKey);
    if (group.count >= NOTIFICATION_EVENTS.SURVEY_RESPONSE.grouping.maxCount) {
      return await this._flushGroup(groupKey);
    }

    return null; // Still buffering
  }

  async _flushGroup(groupKey) {
    const group = this.groupingBuffer.get(groupKey);
    if (!group) return null;

    const { data, count } = group;
    const firstResponse = data[0];

    // Create grouped notification
    const survey = await Survey.findByPk(firstResponse.surveyId);
    const groupedNotifications = [];

    for (const recipient of firstResponse.recipients) {
      const notification = await this._createNotification({
        userId: recipient.userId,
        type: 'survey_response',
        title: 'Nhiều phản hồi khảo sát mới',
        message: `${count} phản hồi mới từ khảo sát "${survey.title}"`,
        actionUrl: firstResponse.actionUrl,
        priority: 'normal',
        surveyId: firstResponse.surveyId,
        workspaceId: firstResponse.workspaceId,
        metadata: {
          grouped: true,
          count,
          actions: {
            primary: { action: 'view_analytics', label: 'Xem phân tích' }
          }
        }
      });
      groupedNotifications.push(notification);
    }

    // Clear group buffer
    this.groupingBuffer.delete(groupKey);

    return groupedNotifications;
  }
}

module.exports = AdvancedNotificationService;