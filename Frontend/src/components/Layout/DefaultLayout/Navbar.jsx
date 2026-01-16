import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NotificationCenter } from '../../Notifications';
import { useLanguage } from '../../../contexts/LanguageContext';
import UpgradeModal from '../../UpgradeToCreator/UpgradeModal';
import styles from './Navbar.module.scss';

const Navbar = ({ onToggleSidebar }) => {
  const { state, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return '#ef4444';
      case 'creator': return '#14B8A6';
      case 'user': return '#14B8A6';
      default: return '#6b7280';
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarLeft}>
        <button
          className={styles.menuButton}
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className={styles.brand}>
          <svg className={styles.logo} width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#14B8A6" />
            <path d="M8 12h16M8 16h16M8 20h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className={styles.brandName}>ALLMTAGS</span>
        </div>
      </div>

      <div className={styles.navbarRight}>
        {state.user && (
          <>
            <NotificationCenter />
            <div className={styles.userSection}>
              <div
                className={styles.userInfo}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className={styles.avatar}>
                  {getInitials(state.user.full_name || state.user.username)}
                </div>
                <div className={styles.userDetails}>
                  <span className={styles.userName}>{state.user.full_name || state.user.username}</span>
                  <span
                    className={styles.userRole}
                    style={{ color: getRoleBadgeColor(state.user.role) }}
                  >
                    {state.user.role}
                  </span>
                </div>
                <svg
                  className={`${styles.chevron} ${showUserMenu ? styles.chevronUp : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>

              {showUserMenu && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <p className={styles.dropdownName}>{state.user.full_name}</p>
                    <p className={styles.dropdownEmail}>{state.user.email}</p>
                  </div>
                  <div className={styles.dropdownDivider}></div>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/profile');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM3 14a5 5 0 0110 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {t('profile')}
                  </button>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/settings');
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M12.5 8a4.5 4.5 0 00-.5-2M3.5 8a4.5 4.5 0 01.5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {t('settings')}
                  </button>

                  {/* Upgrade to Creator - Only for User Role */}
                  {state.user.role === 'user' && (
                    <>
                      <button
                        className={styles.dropdownItem}
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowUpgradeModal(true);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                        Upgrade to Creator
                      </button>
                      <div className={styles.dropdownDivider}></div>
                    </>
                  )}

                  <button
                    className={`${styles.dropdownItem} ${styles.logoutButton}`}
                    onClick={handleLogout}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {t('logout')}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showUserMenu && (
        <div
          className={styles.overlay}
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* Upgrade to Creator Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </nav>
  );
};

export default Navbar;
