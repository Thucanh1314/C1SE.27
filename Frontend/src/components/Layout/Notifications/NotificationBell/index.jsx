// src/components/UI/NotificationBell/index.jsx
import React, { useState, useEffect } from 'react';
import styles from './NotificationBell.module.scss';
import NotificationService from '../../../../api/services/notification.service';
import useRealTimeNotifications from '../../../../hooks/useRealTimeNotifications';
// NotificationPanel is sibling in ../NotificationPanel, so ../NotificationPanel works?
// NotificationBell is in /Notifications/NotificationBell/
// NotificationPanel is in /Notifications/NotificationPanel/
// ../NotificationPanel goes to /Notifications/NotificationPanel. Correct.
import NotificationPanel from '../NotificationPanel';

const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Setup real-time notifications with fallback polling
  useRealTimeNotifications(
    () => fetchUnreadCount(), // onNewNotification callback
    (count) => setUnreadCount(count) // onUnreadCountUpdate callback
  );

  const fetchUnreadCount = async () => {
    const result = await NotificationService.getUnreadCount();
    if (result.ok) {
      setUnreadCount(result.count || 0);
    }
  };

  const handleBellClick = () => {
    setShowPanel(!showPanel);
  };

  return (
    <div className={styles.notificationBell}>
      <button
        className={styles.bellButton}
        onClick={handleBellClick}
        title="Notifications"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showPanel && (
        <NotificationPanel
          key={showPanel ? 'open' : 'closed'}
          onClose={() => setShowPanel(false)}
          onNotificationRead={fetchUnreadCount}
        />
      )}
    </div>
  );
};

export default NotificationBell;
