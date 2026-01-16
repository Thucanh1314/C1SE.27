import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import socketService from '../../../api/services/socket.service';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './DefaultLayout.module.scss';

/**
 * DefaultLayout Component
 * Main layout wrapper with Navbar and Sidebar
 * Provides consistent layout structure for all protected pages
 */
const DefaultLayout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { state } = useAuth();

  // Initialize socket service when user is authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.user) {
      socketService.init();
    }
  }, [state.isAuthenticated, state.user]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className={styles.layout}>
      <Navbar onToggleSidebar={toggleSidebar} />
      
      <div className={styles.container}>
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        
        <main className={styles.main}>
          <div className={styles.content}>
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DefaultLayout;
