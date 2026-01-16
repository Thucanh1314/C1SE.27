// src/components/UI/NotificationPanel/index.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './NotificationPanel.module.scss';
import NotificationService from '../../../../api/services/notification.service';
import NotificationIcon from './NotificationIcons';
import NotificationEmptyState from './NotificationEmptyState';
import { useToast } from '../../../../contexts/ToastContext';

const NotificationPanel = ({ onClose, onNotificationRead }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchNotifications();

    // Also set up a polling interval to refresh notifications while panel is open
    const pollInterval = setInterval(fetchNotifications, 10000); // Every 10 seconds

    return () => clearInterval(pollInterval);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const result = await NotificationService.getUnreadNotifications(20);
    if (result.ok) {
      // Sort by created_at desc just in case
      const sorted = (result.notifications || []).sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
      setNotifications(sorted);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (notificationId) => {
    const result = await NotificationService.markAsRead(notificationId);
    if (result.ok) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      onNotificationRead?.();
    }
  };

  const handleNotificationClick = async (notification) => {
    // Get action URL from either direct property or data field
    const actionUrl = notification.action_url ||
      (notification.data && notification.data.action_url) ||
      null;

    // Handle different notification types with specific routing
    let targetUrl = actionUrl;

    if (!targetUrl && notification.type === 'survey_invitation') {
      if (notification.data && notification.data.invite_token) {
        targetUrl = `/public/invite/${notification.data.invite_token}`;
      } else if (notification.related_survey_id) {
        targetUrl = `/surveys/${notification.related_survey_id}/respond`;
      }
    }

    // Mark as read first
    if (!notification.is_read) {
      await handleMarkAsRead(notification.id);
    }

    // Navigate if we have a target URL
    if (targetUrl) {
      try {
        navigate(targetUrl);
        onClose(); // Close panel after click
      } catch (error) {
        console.error('Navigation error:', error);
        showToast('Navigation failed', 'error');
      }
    } else {
      // No action URL found - just mark as read and show toast
      showToast('Notification marked as read', 'info');
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await NotificationService.markAllAsRead();
    if (result.ok) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onNotificationRead?.();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';

      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m`;

      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d`;

      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  return (
    <div className={styles.notificationPanel}>
      <div className={styles.header}>
        <h3>Notifications</h3>
        {notifications.length > 0 && (
          <button
            className={styles.markAllRead}
            onClick={handleMarkAllAsRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : notifications.length === 0 ? (
          <NotificationEmptyState />
        ) : (
          <div className={styles.notificationList}>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notification} ${!notification.is_read ? styles.unread : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.iconWrapper}>
                  <NotificationIcon type={notification.type} />
                </div>
                <div className={styles.info}>
                  <div className={styles.titleRow}>
                    <span className={styles.title}>{notification.title}</span>
                    {!notification.is_read && <span className={styles.dot}></span>}
                  </div>
                  <div className={styles.message}>{notification.message}</div>
                  <div className={styles.footer}>
                    <span className={styles.time}>{formatDate(notification.createdAt || notification.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
