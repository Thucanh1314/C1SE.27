import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { TokenService } from '../api/services/token.service.js';
import AuthService from '../api/services/auth.service.js';
import socketService from '../api/services/socket.service.js';
import { useToast } from './ToastContext.jsx';

// Initial state
const initialState = {
  user: null,
  token: TokenService.getStoredTokensSync()?.accessToken || null,
  refreshToken: TokenService.getStoredTokensSync()?.refreshToken || null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isRefreshing: false
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isRefreshing: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'REFRESH_TOKEN_START':
      return {
        ...state,
        isRefreshing: true,
      };
    case 'REFRESH_TOKEN_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isRefreshing: false,
      };
    case 'REFRESH_TOKEN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isRefreshing: false,
      };
    default:
      return state;
  }
};

// Auth Context
const AuthContext = createContext(undefined);

// Auth Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { showInfo } = useToast();

  // Refresh token function
  const refreshAuthToken = async () => {
    dispatch({ type: 'REFRESH_TOKEN_START' });
    try {
      const refreshToken = state.refreshToken;
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const data = await AuthService.refreshToken(refreshToken);
      TokenService.saveTokens(data.data.token, data.data.refreshToken);

      dispatch({
        type: 'REFRESH_TOKEN_SUCCESS',
        payload: {
          token: data.data.token,
          refreshToken: data.data.refreshToken,
        },
      });
    } catch (error) {
      dispatch({ type: 'REFRESH_TOKEN_FAILURE' });
      logout();
    }
  };

  // Token expiration check
  useEffect(() => {
    if (state.token) {
      try {
        const tokenParts = state.token.split('.');
        if (tokenParts.length < 2) return;

        const decoded = atob(tokenParts[1]);
        if (!decoded || decoded === 'undefined') return;

        const tokenData = JSON.parse(decoded);
        const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expirationTime - currentTime;

        if (timeUntilExpiry <= 0) {
          // Token has expired
          refreshAuthToken();
        } else {
          // Set up refresh before token expires
          const refreshTime = timeUntilExpiry - 60000; // Refresh 1 minute before expiry
          const refreshTimer = setTimeout(() => {
            refreshAuthToken();
          }, refreshTime);

          return () => clearTimeout(refreshTimer);
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.token]);

  // Login function
  const login = async (loginData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      // Input validation
      if (!loginData || (!loginData.email && !loginData.username) || !loginData.password) {
        throw new Error('Username/Email and password are required');
      }

      // Use identifier (email or username)
      const identifier = loginData.email || loginData.username;
      const data = await AuthService.login(identifier, loginData.password);

      // Backend returns: { success, data: { user, token, refreshToken } }
      const responseData = data.data;
      const user = responseData.user;

      const userObj = {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        createdAt: new Date(user.created_at || user.createdAt),
        updatedAt: new Date(user.updated_at || user.updatedAt),
      };

      TokenService.saveTokens(responseData.token, responseData.refreshToken);
      TokenService.saveUser(userObj);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: userObj,
          token: responseData.token,
          refreshToken: responseData.refreshToken
        },
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw new Error(errorMessage);
    }
  };

  // Register function
  const register = async (
    username,
    email,
    password,
    full_name,
    role
  ) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const data = await AuthService.register({ username, email, password, full_name, role });

      const user = data.data.user;
      const userObj = {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        createdAt: new Date(user.created_at || user.createdAt),
        updatedAt: new Date(user.updated_at || user.updatedAt),
      };

      TokenService.saveTokens(data.data.token, data.data.refreshToken);
      TokenService.saveUser(userObj);

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: userObj, token: data.data.token, refreshToken: data.data.refreshToken },
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage,
      });
      throw new Error(errorMessage);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      TokenService.clearAll();
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // Refetch user data function
  const refetchUserData = async () => {
    try {
      const response = await AuthService.getProfile();
      if (response.success) {
        const user = response.data.user;
        const userObj = {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          createdAt: new Date(user.created_at || user.createdAt),
          updatedAt: new Date(user.updated_at || user.updatedAt),
        };

        TokenService.saveUser(userObj);
        dispatch({ type: 'SET_USER', payload: userObj });
        console.log('✅ User context refreshed after role update');
      }
    } catch (error) {
      console.error('❌ Failed to refetch user data:', error);
    }
  };

  // Listen for role updates
  useEffect(() => {
    if (!state.user || !state.isAuthenticated) return;

    const handleRoleUpdated = (data) => {
      // data: { userId, oldRole, newRole, reason, action }
      if (data.userId.toString() !== state.user.id.toString()) return;

      console.log(`🔄 Role update received: ${data.oldRole} → ${data.newRole} (${data.reason || 'manual'})`);

      // Show toast notification
      showInfo(`Your account role has been updated to ${data.newRole}`);

      // Notify components about role update (can be used for toasts elsewhere)
      window.dispatchEvent(new CustomEvent('user_role_updated', { detail: data }));

      // Refetch full profile to ensure all state is consistent
      refetchUserData();
    };

    const unsubscribe = socketService.on('role_updated', handleRoleUpdated);

    return () => {
      unsubscribe();
    };
  }, [state.user?.id, state.isAuthenticated, showInfo, refetchUserData]);

  // Initialize auth state from localStorage
  React.useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const tokens = TokenService.getStoredTokensSync();

        if (tokens && userStr && userStr !== 'undefined') {
          try {
            const userObj = JSON.parse(userStr);
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: userObj,
                token: tokens.accessToken,
                refreshToken: tokens.refreshToken
              },
            });
          } catch (parseError) {
            console.error('Failed to parse user from localStorage:', parseError);
            TokenService.clearAll();
          }
        }
      } catch (error) {
        console.error('Error initializing auth state:', error);
        TokenService.clearAll();
      }
    }
  }, []);

  const value = {
    state,
    dispatch,
    login,
    register,
    logout,
    clearError,
    refetchUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};