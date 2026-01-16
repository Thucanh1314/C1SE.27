import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import UpgradeUpsellModal from '../../UI/UpgradeUpsellModal/UpgradeUpsellModal';
import styles from './Sidebar.module.scss';

const Sidebar = ({ isOpen, onClose }) => {
  const { state } = useAuth();
  const { t } = useLanguage();
  const [showUpsell, setShowUpsell] = React.useState(false);
  const userRole = state.user?.role;

  // Define menu items based on roles
  const getMenuItems = () => {
    // Base items for all authenticated users
    const baseItems = [
      { path: '/my-responses', label: t('responses'), icon: 'responses' },
    ];

    // Admin view
    if (userRole === 'admin') {
      return [
        { path: '/dashboard', label: t('dashboard'), icon: 'dashboard' },
        { path: '/users', label: t('users'), icon: 'users' },
        { path: '/admin/upgrade-requests', label: 'Upgrade Requests', icon: 'upgrade' },
        { path: '/workspaces', label: t('workspaces'), icon: 'workspaces' },
        { path: '/templates', label: t('templates'), icon: 'templates' },
        { path: '/surveys', label: t('surveys'), icon: 'surveys' },
        { path: '/collectors', label: t('collectors'), icon: 'collectors' },
        { path: '/analytics', label: t('analytics'), icon: 'analytics' },
        { path: '/llm', label: t('llm'), icon: 'llm' },
        { path: '/my-responses', label: t('responses'), icon: 'responses' },
      ];
    }

    // Creator view
    if (userRole === 'creator') {
      return [
        { path: '/dashboard', label: t('dashboard'), icon: 'dashboard' },
        { path: '/workspaces', label: t('workspaces'), icon: 'workspaces' },
        { path: '/templates', label: t('templates'), icon: 'templates' },
        { path: '/surveys', label: t('surveys'), icon: 'surveys' },
        { path: '/collectors', label: t('collectors'), icon: 'collectors' },
        { path: '/analytics', label: t('analytics'), icon: 'analytics' },
        { path: '/llm', label: t('llm'), icon: 'llm' },
        { path: '/my-responses', label: t('responses'), icon: 'responses' },
      ];
    }

    // User view (Dynamic)
    if (userRole === 'user') {
      return [
        { path: '/dashboard', label: t('dashboard'), icon: 'dashboard', isLocked: true },
        { path: '/workspaces', label: t('workspaces'), icon: 'workspaces', isLocked: true },
        { path: '/templates', label: t('templates'), icon: 'templates', isLocked: true },
        { path: '/surveys', label: t('surveys'), icon: 'surveys', isLocked: true },
        { path: '/collectors', label: t('collectors'), icon: 'collectors', isLocked: true },
        { path: '/analytics', label: t('analytics'), icon: 'analytics', isLocked: true },
        { path: '/llm', label: t('llm'), icon: 'llm', isLocked: true },
        { path: '/my-responses', label: t('responses'), icon: 'responses' },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();

  const getIcon = (iconName) => {
    const icons = {
      dashboard: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      users: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4 17a6 6 0 0112 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      templates: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7h6M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      surveys: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M7 7h6M7 10h6M7 13h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      collectors: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M6 3h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
          <rect x="7" y="7" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
          <rect x="9" y="9" width="2" height="2" fill="currentColor" />
        </svg>
      ),
      responses: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.5L9 17.5 5.5 15H5a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 8h6M7 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      analytics: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M3 17V10M10 17V3M17 17v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      llm: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      workspaces: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="12" y="3" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="3" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
          <rect x="12" y="12" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
      notifications: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M15 17H5a1 1 0 01-1-1v-5a4 4 0 014-4h4a4 4 0 014 4v5a1 1 0 01-1 1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 2a1 1 0 012 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="16" cy="6" r="2.5" fill="currentColor" />
        </svg>
      ),
      chat: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M18 11c0 4.97-4.03 9-9 9H5l-3.5 2.5V11c0-4.97 4.03-9 9-9s9 4.03 9 9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      invitations: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M2.5 5.5l7 5 7-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      upgrade: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 6v8M7 9l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      lock: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      )
    };

    return icons[iconName] || icons.dashboard;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Navigation</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.isLocked ? '#' : item.path}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive && !item.isLocked ? styles.navItemActive : ''} ${item.isLocked ? styles.navItemLocked : ''}`
              }
              onClick={(e) => {
                if (item.isLocked) {
                  e.preventDefault();
                  setShowUpsell(true);
                } else {
                  onClose();
                }
              }}
              title={item.isLocked ? 'Upgrade to Creator to unlock' : ''}
            >
              <span className={styles.navIcon}>{getIcon(item.icon)}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.isLocked && <span className={styles.lockIcon}>{getIcon('lock')}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Upsell Modal */}
        {showUpsell && (
          <div className={styles.upsellWrapper}>
            <UpgradeUpsellModal
              isOpen={showUpsell}
              onClose={() => setShowUpsell(false)}
              onUpgrade={() => {
                // Logic to open actual upgrade modal/request
                // We'll assume the user needs to go to profile or trigger a state
              }}
            />
          </div>
        )}

        {/* Role indicator at bottom */}
        <div className={styles.sidebarFooter}>
          <div className={styles.roleIndicator}>
            <div className={styles.roleIcon}>
              {userRole === 'admin' && '👑'}
              {userRole === 'creator' && '✏️'}
              {userRole === 'user' && '👤'}
            </div>
            <div className={styles.roleInfo}>
              <span className={styles.roleLabel}>Logged in as</span>
              <span className={styles.roleName}>{userRole}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
