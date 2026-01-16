const { Notification, User, Survey, Workspace } = require('../../../models');
const logger = require('../../../utils/logger');
const { Op } = require('sequelize');

class NotificationService {
  /**
   * Create and send notification
   */
  async createNotification({
    userId,
    type,
    title,
    message,
    actionUrl = null,
    actorId = null,
    relatedSurveyId = null,
    relatedWorkspaceId = null,
    relatedResponseId = null,
    relatedUserId = null,
    priority = 'normal',
    category = 'system',
    metadata = null
  }) {
    try {
      // Create notification in database
      const notification = await Notification.create({
        user_id: userId,
        type,
        title,
        message,
        action_url: actionUrl,
        actor_id: actorId,
        related_survey_id: relatedSurveyId,
        related_workspace_id: relatedWorkspaceId,
        related_response_id: relatedResponseId,
        related_user_id: relatedUserId,
        priority,
        category,
        metadata,
        is_read: false,
        is_archived: false
      });

      // Get actor info if provided
      if (actorId) {
        const actor = await User.findByPk(actorId, {
          attributes: ['id', 'username', 'full_name']
        });

        if (actor) {
          notification.actor_name = actor.full_name || actor.username;
          notification.actor_avatar = actor.avatar;
          await notification.save();
        }
      }

      // Send real-time notification via WebSocket
      await this.sendRealTimeNotification(userId, notification);

      logger.info(`✅ Notification created for user ${userId}: ${type}`);
      return notification;
    } catch (error) {
      logger.error(`❌ Error creating notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  async sendRealTimeNotification(userId, notification) {
    try {
      // Try to get socket.io instance, but don't crash if not available
      let io;
      try {
        io = require('../../../config/socket.config').getIO();
      } catch (err) {
        // Socket module not available, skip real-time notification
        logger.warn('⚠️ Socket.IO not available, skipping real-time notification');
        return;
      }

      if (!io) {
        logger.warn('⚠️ Socket.IO not initialized, skipping real-time notification');
        return;
      }

      // Emit to specific user's room
      io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        action_url: notification.action_url, // Consistent snake_case
        actor: {
          id: notification.actor_id,
          name: notification.actor_name,
          avatar: notification.actor_avatar
        },
        priority: notification.priority,
        category: notification.category,
        is_read: notification.is_read,
        created_at: notification.created_at // Consistent snake_case
      });

      logger.info(`📡 Real-time notification sent to user ${userId}`);
    } catch (error) {
      logger.error(`❌ Error sending real-time notification: ${error.message}`);
      // Don't throw - notification is already saved in DB
    }
  }

  /**
   * Batch notify workspace members
   */
  async notifyWorkspaceMembers(workspaceId, notificationData, excludeUserId = null) {
    try {
      const { WorkspaceMember } = require('../../../models');

      const members = await WorkspaceMember.findAll({
        where: {
          workspace_id: workspaceId,
          is_active: true,
          ...(excludeUserId && { user_id: { [Op.ne]: excludeUserId } })
        }
      });

      const promises = members.map(member =>
        this.createNotification({
          ...notificationData,
          userId: member.user_id
        })
      );

      await Promise.all(promises);
      logger.info(`✅ Notified ${members.length} workspace members`);
    } catch (error) {
      logger.error(`❌ Error notifying workspace members: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      if (!notification.is_read) {
        notification.is_read = true;
        notification.read_at = new Date();
        await notification.save();

        // Emit read event to update UI (safe)
        try {
          const io = require('../../../config/socket.config').getIO();
          if (io) {
            io.to(`user_${userId}`).emit('notification:read', {
              notificationId: notification.id
            });
          }
        } catch (err) {
          // Socket not available, skip
        }
      }

      return notification;
    } catch (error) {
      logger.error(`❌ Error marking notification as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    try {
      const [updatedCount] = await Notification.update(
        {
          is_read: true,
          read_at: new Date()
        },
        {
          where: {
            user_id: userId,
            is_read: false
          }
        }
      );

      // Emit event to update UI (safe)
      try {
        const io = require('../../../config/socket.config').getIO();
        if (io) {
          io.to(`user_${userId}`).emit('notification:all_read');
        }
      } catch (err) {
        // Socket not available, skip
      }

      logger.info(`✅ Marked ${updatedCount} notifications as read for user ${userId}`);
      return { count: updatedCount };
    } catch (error) {
      logger.error(`❌ Error marking all as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId }
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.is_archived = true;
      await notification.save();

      return notification;
    } catch (error) {
      logger.error(`❌ Error archiving notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user notifications with pagination and filters
   */
  async getUserNotifications(userId, {
    page = 1,
    limit = 20,
    unreadOnly = false,
    category = null,
    includeArchived = false
  }) {
    try {
      const where = {
        user_id: userId,
        ...(includeArchived ? {} : { is_archived: false })
      };

      if (unreadOnly) {
        where.is_read = false;
      }

      if (category) {
        where.category = category;
      }

      const { count, rows } = await Notification.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        order: [
          ['is_read', 'ASC'], // Unread first
          ['created_at', 'DESC'] // Then by time
        ],
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'username', 'full_name']
          }
        ]
      });

      const mappedNotifications = rows.map(n => {
        const data = n.toJSON();
        return {
          ...data,
          // Normalize names for frontend
          created_at: data.created_at || data.createdAt,
          updated_at: data.updated_at || data.updatedAt,
          is_read: data.is_read !== undefined ? data.is_read : data.isRead,
          actionUrl: data.actionUrl || data.action_url,
          actor: data.User ? {
            id: data.User.id,
            name: data.User.full_name || data.User.username,
            avatar: data.User.avatar
          } : null
        };
      });

      const unreadCount = await this.getUnreadCount(userId);

      return {
        notifications: mappedNotifications,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        },
        unreadCount
      };
    } catch (error) {
      logger.error(`❌ Error getting user notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    try {
      return await Notification.count({
        where: {
          user_id: userId,
          is_read: false,
          is_archived: false
        }
      });
    } catch (error) {
      logger.error(`❌ Error getting unread count: ${error.message}`);
      return 0;
    }
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await Notification.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate
          },
          is_read: true,
          is_archived: true
        }
      });

      logger.info(`🗑️ Deleted ${deletedCount} old notifications`);
      return { count: deletedCount };
    } catch (error) {
      logger.error(`❌ Error deleting old notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Notify workspace members about an event (with role-based filtering)
   */
  async notifyWorkspaceMembers({
    workspaceId,
    type,
    title,
    message,
    actionUrl = null,
    actorId = null,
    relatedSurveyId = null,
    excludeUserIds = [],
    priority = 'normal',
    category = 'workspace',
    surveyStatus = null, // For survey-specific role filtering
    notifyRoles = ['owner', 'collaborator', 'viewer', 'member'] // Default: all roles
  }) {
    try {
      const { WorkspaceMember } = require('../../../models');

      // Get workspace with owner info
      const workspace = await Workspace.findByPk(workspaceId, {
        include: [{
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'email']
        }]
      });

      if (!workspace) {
        throw new Error(`Workspace ${workspaceId} not found`);
      }

      // Get workspace members
      const members = await WorkspaceMember.findAll({
        where: { workspace_id: workspaceId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }]
      });

      // Apply role-based filtering for survey notifications
      let eligibleRoles = notifyRoles;

      if (category === 'survey' && surveyStatus) {
        switch (surveyStatus) {
          case 'draft':
            // Draft surveys: Only managers need to know
            eligibleRoles = ['owner', 'collaborator', 'viewer'];
            break;
          case 'active':
            // Active surveys: Everyone should know (members can participate)
            eligibleRoles = ['owner', 'collaborator', 'viewer', 'member'];
            break;
          case 'closed':
          case 'archived':
            // Closed/Archived: Only managers need to know
            eligibleRoles = ['owner', 'collaborator', 'viewer'];
            break;
          default:
            // For other statuses or general updates, notify managers
            eligibleRoles = ['owner', 'collaborator', 'viewer'];
        }
      }

      // Collect eligible user IDs to notify
      const userIdsToNotify = new Set();

      // Always include workspace owner if eligible
      if (workspace.owner && eligibleRoles.includes('owner')) {
        userIdsToNotify.add(workspace.owner.id);
      }

      // Add eligible members based on their role
      members.forEach(member => {
        if (member.user && eligibleRoles.includes(member.role)) {
          userIdsToNotify.add(member.user.id);
        }
      });

      // Remove excluded users
      excludeUserIds.forEach(id => userIdsToNotify.delete(id));

      const notifications = [];

      // Create notification for each eligible user
      for (const userId of userIdsToNotify) {
        try {
          const notification = await this.createNotification({
            userId,
            type,
            title,
            message,
            actionUrl,
            actorId,
            relatedSurveyId,
            relatedWorkspaceId: workspaceId,
            priority,
            category
          });
          notifications.push(notification);
        } catch (error) {
          logger.error(`❌ Failed to create notification for user ${userId}:`, error.message);
        }
      }

      logger.info(`✅ Created ${notifications.length} role-filtered notifications for workspace ${workspaceId} (roles: ${eligibleRoles.join(', ')})`);
      return { count: notifications.length, notifications, eligibleRoles };
    } catch (error) {
      logger.error(`❌ Error notifying workspace members:`, error.message);
      throw error;
    }
  }

  /**
   * Create notification for workspace invitation
   */
  async notifyWorkspaceInvitation(userId, workspaceId, inviterId, message, token = null) {
    return await this.createNotification({
      userId,
      type: 'workspace_invitation',
      title: 'Workspace Invitation',
      message: message || 'You have been invited to join a workspace',
      relatedWorkspaceId: workspaceId,
      actorId: inviterId,
      actionUrl: '/invitations', // Absolute frontend path for SPA navigation
      category: 'workspace',
      metadata: token ? { token } : null
    });
  }

  /**
   * Notify workspace owner of a role change request
   */
  async notifyRoleChangeRequest(ownerId, workspaceId, workspaceName, requesterId, requesterName, requestedRole) {
    return await this.createNotification({
      userId: ownerId,
      type: 'role_change_request',
      title: 'Promotion Request',
      message: `${requesterName} has requested to be promoted to ${requestedRole} in "${workspaceName}"`,
      relatedWorkspaceId: workspaceId,
      actorId: requesterId,
      actionUrl: '/notifications', // Absolute frontend path
      category: 'workspace',
      metadata: {
        requesting_userId: requesterId,
        requested_role: requestedRole,
        workspace_id: workspaceId
      }
    });
  }

  /**
   * Create notification for member added to workspace
   */
  async notifyMemberAdded(userId, workspaceId, workspaceName, addedByName) {
    return await this.createNotification({
      userId,
      type: 'workspace_member_added',
      title: 'Added to Workspace',
      message: `${addedByName} added you to "${workspaceName}"`,
      relatedWorkspaceId: workspaceId,
      actionUrl: `/workspaces/${workspaceId}`, // Absolute frontend path
      category: 'workspace'
    });
  }
}

module.exports = new NotificationService();
