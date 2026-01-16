const notificationService = require('../service/notification.service');
const logger = require('../../../utils/logger');

class NotificationController {
  /**
   * Get user notifications
   * GET /api/modules/notifications
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { page, limit, unreadOnly, category } = req.query;

      const result = await notificationService.getUserNotifications(userId, {
        page: page || 1,
        limit: limit || 20,
        unreadOnly: unreadOnly === 'true',
        category: category || null
      });

      res.json({
        ok: true,
        ...result
      });
    } catch (error) {
      logger.error('Error getting notifications:', error);
      res.status(500).json({
        ok: false,
        message: error.message
      });
    }
  }

  /**
   * Get unread count
   * GET /api/modules/notifications/unread-count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(userId);

      res.json({
        ok: true,
        count
      });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      res.status(500).json({
        ok: false,
        message: error.message
      });
    }
  }

  /**
   * Mark notification as read
   * PUT /api/modules/notifications/:id/read
   */
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const notification = await notificationService.markAsRead(notificationId, userId);

      res.json({
        ok: true,
        notification
      });
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      res.status(500).json({
        ok: false,
        message: error.message
      });
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/modules/notifications/read-all
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const result = await notificationService.markAllAsRead(userId);

      res.json({
        ok: true,
        ...result
      });
    } catch (error) {
      logger.error('Error marking all as read:', error);
      res.status(500).json({
        ok: false,
        message: error.message
      });
    }
  }

  /**
   * Archive notification
   * PUT /api/modules/notifications/:id/archive
   */
  async archiveNotification(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = req.params.id;

      const notification = await notificationService.archiveNotification(notificationId, userId);

      res.json({
        ok: true,
        notification
      });
    } catch (error) {
      logger.error('Error archiving notification:', error);
      res.status(500).json({
        ok: false,
        message: error.message
      });
    }
  }

  /**
   * Create notification (admin/system only)
   * POST /api/modules/notifications
   */
  async createNotification(req, res) {
    try {
      const notification = await notificationService.createNotification(req.body);

      res.json({
        ok: true,
        notification
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({
        ok: false,
        message: error.message
      });
    }
  }
}

module.exports = new NotificationController();
