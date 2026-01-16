// src/api/services/auth.service.js - Authentication API service
import http, { setAuthToken, clearAuth } from '../http';

const AuthService = {
  /**
   * Register new user
   */
  async register(userData) {
    const response = await http.post('/auth/register', userData);
    const { user, token, refreshToken } = response.data.data;

    // Store tokens
    if (token) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token);
    }

    return response.data;
  },

  /**
   * Login user
   */
  async login(identifier, password) {
    // Backend expects { email, password } or { username, password }
    // Send as email if it contains @, otherwise as username
    const loginPayload = identifier.includes('@')
      ? { email: identifier, password }
      : { username: identifier, password };

    const response = await http.post('/auth/login', loginPayload);

    const { user, token, refreshToken } = response.data.data;

    // Store tokens and user data
    if (token) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setAuthToken(token);
    }

    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    const response = await http.post('/auth/refresh', { refreshToken });
    const { token: newToken, refreshToken: newRefreshToken } = response.data.data;

    if (newToken) {
      localStorage.setItem('authToken', newToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
      setAuthToken(newToken);
    }

    return response.data;
  },

  /**
   * Get current user profile
   */
  async getProfile() {
    const response = await http.get('/auth/profile');
    const user = response.data.data.user;

    // Update stored user data
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  },

  /**
   * Logout user
   */
  async logout() {
    try {
      await http.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  },

  /**
   * Change password
   */
  async changePassword(passwordData) {
    const response = await http.post('/auth/change-password', passwordData);
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  },

  /**
   * Get stored user data
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken() {
    return localStorage.getItem('authToken');
  },
};

export default AuthService;
