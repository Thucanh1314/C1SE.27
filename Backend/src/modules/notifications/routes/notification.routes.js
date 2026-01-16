const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notification.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// Get user notifications (with filters)
router.get('/', notificationController.getNotifications);

// Get unread notifications (backward compatibility)
router.get('/unread', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// Archive notification
router.put('/:id/archive', notificationController.archiveNotification);

// Create notification (for testing/admin)
router.post('/', notificationController.createNotification);

module.exports = router;
