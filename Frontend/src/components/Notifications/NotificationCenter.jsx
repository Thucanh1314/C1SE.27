import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, X, Clock, Users, BarChart, AlertTriangle, UserPlus, Sparkles } from 'lucide-react';
import notificationService from '../../api/services/notification.service';
import socketService from '../../api/services/socket.service';
import { formatDistanceToNow } from 'date-fns';
import styles from './NotificationCenter.module.scss';
import clsx from 'clsx';

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const userRole = state.user?.role;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications(20);
      if (response.ok) {
        setNotifications(response.notifications || []);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle notification actions
  const handleNotificationAction = async (notificationId, action) => {
    try {
      const response = await notificationService.handleNotificationAction(notificationId, action);
      if (response.success) {
        // Update notification status
        setNotifications(prev => prev.map(notif =>
          notif.id === notificationId
            ? { ...notif, is_read: true, actionTaken: action }
            : notif
        ));

        // Decrease unread count if it was unread
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }

        // Handle redirect if provided in response
        if (response.redirectUrl) {
          setIsOpen(false);
          navigate(response.redirectUrl);
        }
      }
    } catch (error) {
      console.error('Failed to handle notification action:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await notificationService.markAsRead(notificationId);
      if (response.ok) {
        setNotifications(prev => prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await notificationService.markAllAsRead();
      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Socket.IO event handlers
  useEffect(() => {
    const handleNewNotification = (notification) => {
      if (!notification || !notification.id) return;

      setNotifications(prev => {
        // Avoid duplicates
        if (prev.some(n => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount(prev => prev + 1);

      // Show browser notification if supported
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    };

    const handleWorkspaceInvite = (data) => {
      handleNewNotification(data);

      // Special handling for Users - unlock workspace menu
      if (data.unlockWorkspaceMenu) {
        // Trigger workspace menu unlock in sidebar
        window.dispatchEvent(new CustomEvent('unlockWorkspaceMenu', {
          detail: { workspaceId: data.notification.workspaceId }
        }));
      }
    };

    const handleHighPriorityNotification = (data) => {
      handleNewNotification({ ...data, priority: 'high' });

      // Special UI treatment for high priority
      const event = new CustomEvent('highPriorityNotification', { detail: data });
      window.dispatchEvent(event);
    };

    const handleSystemAlert = (data) => {
      handleNewNotification(data);

      // Handle force redirect
      if (data.forceRedirect) {
        setTimeout(() => {
          setIsOpen(false);
          navigate(data.forceRedirect);
        }, 2000);
      }

      // Handle workspace access revocation
      if (data.revokeWorkspaceAccess) {
        window.dispatchEvent(new CustomEvent('workspaceAccessRevoked', {
          detail: { workspaceId: data.revokeWorkspaceAccess }
        }));
      }
    };

    // Socket event listeners
    socketService.on('notification', handleNewNotification);
    socketService.on('workspace_invitation', handleWorkspaceInvite);
    socketService.on('workspace_invite', handleWorkspaceInvite);
    socketService.on('high_priority_notification', handleHighPriorityNotification);
    socketService.on('analysis_completed', handleHighPriorityNotification);
    socketService.on('system_alert', handleSystemAlert);

    // Load notifications on mount
    loadNotifications();

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socketService.off('notification');
      socketService.off('workspace_invitation');
      socketService.off('workspace_invite');
      socketService.off('high_priority_notification');
      socketService.off('analysis_completed');
      socketService.off('system_alert');
    };
  }, [loadNotifications, navigate]);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'workspace_invitation':
      case 'workspace_invite':
        return <UserPlus className="text-blue-500" />;
      case 'survey_response':
      case 'response_completed':
        return <BarChart className="text-green-500" />;
      case 'analysis_completed':
        return <BarChart className="text-purple-500" />;
      case 'role_request':
      case 'role_change_request':
        return <Users className="text-orange-500" />;
      case 'system_alert':
      case 'role_mismatch_alert':
        return <AlertTriangle className="text-red-500" />;
      case 'deadline_reminder':
        return <Clock className="text-yellow-500" />;
      default:
        return <Bell className="text-gray-500" />;
    }
  };

  // Render notification item
  const renderNotification = (notification) => {
    const isUnread = !notification.is_read;
    const hasActions = notification.metadata?.actions && !notification.actionTaken;

    return (
      <div
        key={notification.id}
        className={clsx(styles.notificationItem, {
          [styles.unread]: isUnread,
          [styles.highPriority]: notification.priority === 'high',
          [styles.urgent]: notification.priority === 'urgent',
          [styles.critical]: notification.priority === 'critical'
        })}
        onClick={() => isUnread && markAsRead(notification.id)}
      >
        <div className={styles.iconWrapper}>
          {getNotificationIcon(notification.type)}
        </div>

        <div className={styles.content}>
          <div className={styles.itemHeader}>
            <p className={styles.title}>
              {notification.title}
              {['high', 'urgent', 'critical'].includes(notification.priority) && (
                <span className={clsx(styles.priorityBadge, styles[notification.priority])}>
                  {notification.priority === 'critical' ? 'Critical' :
                    notification.priority === 'urgent' ? 'Urgent' : 'High priority'}
                </span>
              )}
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
              }}
              className={styles.itemRemoveBtn}
              title="Remove notification"
            >
              <X />
            </button>
          </div>

          <p className={styles.message}>{notification.message}</p>
          <div className={styles.itemFooter}>
            <p className={styles.time}>
              {(() => {
                const date = notification.created_at ? new Date(notification.created_at) : null;
                if (!date || isNaN(date.getTime())) return 'Recently';
                return formatDistanceToNow(date, { addSuffix: true });
              })()}
            </p>

            {userRole === 'user' && (notification.type === 'workspace_invitation' || notification.type === 'workspace_invite') && (
              <div className={styles.upgradePrompt}>
                <Sparkles size={12} className={styles.sparkleIcon} />
                <span>Upgrade to Creator for full access</span>
              </div>
            )}

            {notification.actionUrl && (
              <span
                className={styles.actionLink}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  navigate(notification.actionUrl);
                }}
                role="button"
                tabIndex={0}
              >
                View details →
              </span>
            )}
          </div>
        </div>

        {
          hasActions && (
            <div className={styles.itemActions}>
              {notification.metadata.actions.primary && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotificationAction(notification.id, notification.metadata.actions.primary.action);
                  }}
                  className={styles.primaryAction}
                >
                  {notification.metadata.actions.primary.label}
                </button>
              )}

              {notification.metadata.actions.secondary && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNotificationAction(notification.id, notification.metadata.actions.secondary.action);
                  }}
                  className={styles.secondaryAction}
                >
                  {notification.metadata.actions.secondary.label}
                </button>
              )}
            </div>
          )
        }
      </div >
    );
  };

  return (
    <div className={styles.container}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.bellButton}
        aria-label="Notifications"
      >
        <Bell />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          <div className={styles.dropdown}>
            <div className={styles.header}>
              <h3>Notifications</h3>

              <div className={styles.headerActions}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className={styles.markAllBtn}
                  >
                    Mark all as read
                  </button>
                )}

                <button
                  onClick={() => setIsOpen(false)}
                  className={styles.closeBtn}
                  title="Close"
                >
                  <X />
                </button>
              </div>
            </div>

            <div className={styles.list}>
              {loading ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <p>Loading...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map(renderNotification)
              ) : (
                <div className={styles.emptyState}>
                  <Bell />
                  <p>No notifications</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationCenter;
