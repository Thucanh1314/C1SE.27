// src/api/services/notification.service.js
import http from '../http';

class NotificationService {
  /**
   * Get unread notifications for user
   */
  async getUnreadNotifications(limit = 20) {
    try {
      const response = await http.get(`/notifications/unread`, {
        params: { limit }
      });
      return response.data || { ok: false, notifications: [] };
    } catch (error) {
      console.error('[NotificationService.getUnreadNotifications] ERROR:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message,
        notifications: []
      };
    }
  }

  /**
   * Get all notifications
   */
  async getNotifications(limit = 50, offset = 0) {
    try {
      const response = await http.get(`/notifications`, {
        params: { limit, offset }
      });
      return response.data || { ok: false, notifications: [] };
    } catch (error) {
      console.error('[NotificationService.getNotifications] ERROR:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message,
        notifications: []
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const response = await http.put(`/notifications/${notificationId}/read`);
      return response.data || { ok: false };
    } catch (error) {
      console.error('[NotificationService.markAsRead] ERROR:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    try {
      const response = await http.put(`/notifications/read-all`);
      return response.data || { ok: false };
    } catch (error) {
      console.error('[NotificationService.markAllAsRead] ERROR:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      const response = await http.delete(`/notifications/${notificationId}`);
      return response.data || { ok: false };
    } catch (error) {
      console.error('[NotificationService.deleteNotification] ERROR:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get notification count
   */
  async getUnreadCount() {
    try {
      const response = await http.get(`/notifications/unread-count`);
      return response.data || { ok: false, count: 0 };
    } catch (error) {
      console.error('[NotificationService.getUnreadCount] ERROR:', error);
      return { ok: false, count: 0 };
    }
  }

  // ===== ADVANCED NOTIFICATION METHODS =====

  /**
   * Send workspace invitation notification
   */
  async sendWorkspaceInvitation({ workspaceId, invitedUserId, role }) {
    try {
      const response = await http.post('/notifications/workspace-invite', {
        workspaceId,
        invitedUserId,
        role
      });
      return response.data || { success: false };
    } catch (error) {
      console.error('[NotificationService.sendWorkspaceInvitation] ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send survey response notification
   */
  async sendSurveyResponseNotification({ surveyId, respondentId, workspaceId }) {
    try {
      const response = await http.post('/notifications/survey-response', {
        surveyId,
        respondentId,
        workspaceId
      });
      return response.data || { success: false };
    } catch (error) {
      console.error('[NotificationService.sendSurveyResponseNotification] ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send AI analysis completed notification
   */
  async sendAnalysisCompletedNotification({ analysisId, surveyId, workspaceId }) {
    try {
      const response = await http.post('/notifications/analysis-completed', {
        analysisId,
        surveyId,
        workspaceId
      });
      return response.data || { success: false };
    } catch (error) {
      console.error('[NotificationService.sendAnalysisCompletedNotification] ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send role request notification
   */
  async sendRoleRequestNotification({ workspaceId, requestedRole, currentRole }) {
    try {
      const response = await http.post('/notifications/role-request', {
        workspaceId,
        requestedRole,
        currentRole
      });
      return response.data || { success: false };
    } catch (error) {
      console.error('[NotificationService.sendRoleRequestNotification] ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send system alert notification (user kicked)
   */
  async sendSystemAlertNotification({ userId, workspaceId, reason }) {
    try {
      const response = await http.post('/notifications/system-alert', {
        userId,
        workspaceId,
        reason
      });
      return response.data || { success: false };
    } catch (error) {
      console.error('[NotificationService.sendSystemAlertNotification] ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Send deadline reminder notification
   */
  async sendDeadlineReminderNotification({ surveyId, workspaceId, deadline, hoursRemaining }) {
    try {
      const response = await http.post('/notifications/deadline-reminder', {
        surveyId,
        workspaceId,
        deadline,
        hoursRemaining
      });
      return response.data || { success: false };
    } catch (error) {
      console.error('[NotificationService.sendDeadlineReminderNotification] ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Handle notification action (approve, reject, etc.)
   */
  async handleNotificationAction(notificationId, action) {
    try {
      const response = await http.post(`/notifications/${notificationId}/action`, {
        action
      });
      return response.data || { success: false };
    } catch (error) {
      console.error('[NotificationService.handleNotificationAction] ERROR:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }
}

const notificationServiceInstance = new NotificationService();
export default notificationServiceInstance;
