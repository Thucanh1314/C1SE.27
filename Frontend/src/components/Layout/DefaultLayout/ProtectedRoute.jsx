import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import Loader from '../../common/Loader/Loader';

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Handles role-based access control
 * Redirects unauthorized users to login
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { state } = useAuth();
  const location = useLocation();

  // Show loader while checking auth state
  if (state.isLoading) {
    return <Loader fullScreen message="Checking authentication..." />;
  }

  // Redirect to login if not authenticated
  if (!state.isAuthenticated || !state.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(state.user.role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = getRoleBasedRedirect(state.user.role);
    return <Navigate to={redirectPath} replace />;
  }

  // User is authenticated and authorized
  return children;
};

/**
 * Get redirect path based on user role
 */
const getRoleBasedRedirect = (role) => {
  switch (role) {
    case 'admin':
      return '/dashboard';
    case 'creator':
      return '/dashboard';
    case 'user':
      return '/surveys';
    default:
      return '/';
  }
};

/**
 * PublicRoute Component
 * For routes that should redirect authenticated users
 * (e.g., login, register pages)
 */
export const PublicRoute = ({ children, restricted = true }) => {
  const { state } = useAuth();

  // Show loader while checking auth state
  if (state.isLoading) {
    return <Loader fullScreen message="Loading..." />;
  }

  // If authenticated and restricted, redirect to role-based dashboard
  if (state.isAuthenticated && state.user && restricted) {
    const redirectParam = new URLSearchParams(window.location.search).get('redirect');
    if (redirectParam) {
      return <Navigate to={decodeURIComponent(redirectParam)} replace />;
    }
    const redirectPath = getRoleBasedRedirect(state.user.role);
    return <Navigate to={redirectPath} replace />;
  }

  // User is not authenticated, show public route
  return children;
};

export default ProtectedRoute;
