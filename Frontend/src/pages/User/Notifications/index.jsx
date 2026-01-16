import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Notifications.module.scss';
import NotificationService from '../../../api/services/notification.service';
import WorkspaceService from '../../../api/services/workspace.service';
import { useToast } from '../../../contexts/ToastContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, workspace_invitation, survey_response, etc
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    const result = await NotificationService.getNotifications(100);
    if (result.ok) {
      setNotifications(result.notifications || []);
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
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await NotificationService.markAllAsRead();
    if (result.ok) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleDelete = async (notificationId) => {
    await NotificationService.deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
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
      } catch (error) {
        console.error('Navigation error:', error);
        showToast('Navigation failed', 'error');
      }
    } else {
      // No action URL found - just mark as read and show toast
      showToast('Notification marked as read', 'info');
    }
  };

  const handleAcceptWorkspaceInvitation = (notificationId, invitationData) => {
    if (invitationData?.token) {
      window.location.href = `/workspace/invitation/${invitationData.token}/accept`;
      handleMarkAsRead(notificationId);
    }
  };

  const handleRoleRequest = async (notificationId, action) => {
    try {
      const result = await WorkspaceService.handleRoleRequest(notificationId, action);
      if (result.ok) {
        showToast(result.message, 'success');
        // Refresh notifications
        fetchNotifications();
      } else {
        showToast(result.message || 'Action failed', 'error');
      }
    } catch (error) {
      showToast('Error processing request', 'error');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'workspace_invitation':
        return '✉️';
      case 'workspace_member_added':
        return '👥';
      case 'survey_invitation':
        return '📋';
      case 'survey_response':
        return '📝';
      case 'survey_shared':
        return '📤';
      case 'collector_created':
        return '🔗';
      case 'response_completed':
        return '✅';
      case 'role_change_request':
        return '⚡';
      default:
        return '📢';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';

    try {
      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        return 'Unknown date';
      }

      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;

      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Unknown date';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    // Read status filter
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'read' && !n.is_read) return false;

    // Type filter
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(query) ||
        n.body?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Get unique notification types for filter
  const notificationTypes = [
    { id: 'workspace_invitation', label: '✉️ Workspace Invitation' },
    { id: 'workspace_member_added', label: '👥 Member Added' },
    { id: 'survey_invitation', label: '📋 Survey Invitation' },
    { id: 'survey_response', label: '📝 Survey Response' },
    { id: 'survey_shared', label: '📤 Survey Shared' },
    { id: 'collector_created', label: '🔗 Collector Created' },
    { id: 'response_completed', label: '✅ Response Completed' }
  ];

  return (
    <div className={styles.notificationsPage}>
      <div className={styles.pageHeader}>
        <h1>Notifications {unreadCount > 0 && `(${unreadCount})`}</h1>
        {notifications.length > 0 && (
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.markAllRead} onClick={handleMarkAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <>
          <div className={styles.searchBar}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <circle cx="8" cy="8" r="5" strokeWidth="1.5" />
              <path d="M13 13l4 4" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder="Search notifications by title or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                className={styles.clearSearch}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Status:</label>
              <button
                className={`${styles.filterButton} ${filter === 'all' ? styles.active : ''}`}
                onClick={() => setFilter('all')}
              >
                All ({notifications.length})
              </button>
              <button
                className={`${styles.filterButton} ${filter === 'unread' ? styles.active : ''}`}
                onClick={() => setFilter('unread')}
              >
                Unread ({unreadCount})
              </button>
              <button
                className={`${styles.filterButton} ${filter === 'read' ? styles.active : ''}`}
                onClick={() => setFilter('read')}
              >
                Read ({notifications.length - unreadCount})
              </button>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Type:</label>
              <button
                className={`${styles.filterButton} ${typeFilter === 'all' ? styles.active : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                All Types
              </button>
              {notificationTypes.map(type => (
                <button
                  key={type.id}
                  className={`${styles.filterButton} ${typeFilter === type.id ? styles.active : ''}`}
                  onClick={() => setTypeFilter(type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className={styles.notificationsContainer}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={styles.emptyState}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p>{filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}</p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`${styles.notification} ${!notification.is_read ? styles.unread : ''} ${styles.clickable}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className={styles.notificationIcon}>
                {getNotificationIcon(notification.type)}
              </div>

              <div className={styles.notificationContent}>
                <div className={styles.notificationHeader}>
                  <h3 className={styles.notificationTitle}>{notification.title}</h3>
                  <span className={styles.notificationTime}>
                    {formatDate(notification.created_at)}
                  </span>
                </div>

                <p className={styles.notificationBody}>
                  {notification.body}
                </p>

                {notification.data && (
                  <div className={styles.notificationData}>
                    {notification.data.workspace_id && (
                      <span className={`${styles.dataTag} ${styles.workspace}`}>
                        Workspace ID: {notification.data.workspace_id}
                      </span>
                    )}
                    {notification.data.survey_id && (
                      <span className={`${styles.dataTag} ${styles.survey}`}>
                        Survey ID: {notification.data.survey_id}
                      </span>
                    )}
                  </div>
                )}

                <div className={styles.notificationActions}>
                  {!notification.is_read && (
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  )}

                  {notification.type === 'workspace_invitation' && notification.data?.token && (
                    <button
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptWorkspaceInvitation(notification.id, notification.data);
                      }}
                    >
                      Accept Invitation
                    </button>
                  )}

                  {notification.type === 'role_change_request' && !notification.is_read && (
                    <div className={styles.buttonGroup}>
                      <button
                        className={`${styles.actionButton} ${styles.approve}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoleRequest(notification.id, 'approve');
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className={`${styles.actionButton} ${styles.decline}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoleRequest(notification.id, 'decline');
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  <button
                    className={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(notification.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
