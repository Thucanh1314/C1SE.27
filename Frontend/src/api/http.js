// src/api/http.js - Axios HTTP client with JWT interceptors
import axios from 'axios';

// API base URL
const API_BASE_URL = 'http://localhost:5000/api/modules'; // Hardcoded for debugging
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/modules';
console.log('[HTTP] Initialized with Base URL:', API_BASE_URL);

// Create axios instance
const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle 401 and refresh token
http.interceptors.response.use(
  (response) => {
    // Don't process text/html responses (like PDF exports)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html') || response.config.responseType === 'text') {
      return response;
    }
    // Safely extract data, handle cases where response might not have expected structure
    const data = response.data;

    // Handle empty or undefined responses
    if (!data || typeof data !== 'object') {
      return {
        ...response,
        data: {
          ok: response.status >= 200 && response.status < 300,
          message: 'Success'
        }
      };
    }

    // Ensure we always return an object with ok/success flag
    if (!('ok' in data) && 'success' in data) {
      data.ok = data.success;
    }
    if (!('success' in data) && 'ok' in data) {
      data.success = data.ok;
    }

    return response;
  },
  async (error) => {
    // Error suppression to prevent console spam
    const errorKey = `${error.response?.status}-${error.config?.url}`;
    const now = Date.now();

    // Only log if not logged recently (last 5 seconds)
    if (!http._loggedErrors) http._loggedErrors = {};
    if (!http._loggedErrors[errorKey] || now - http._loggedErrors[errorKey] > 5000) {
      console.error('[HTTP] Response error:', error.response?.status, error.response?.data || error.message);
      http._loggedErrors[errorKey] = now;
    }

    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          // No refresh token, redirect to login
          console.warn('[HTTP] No refresh token, redirecting to login');
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Try to refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { token: newToken, refreshToken: newRefreshToken } = response.data.data;

        // Store new tokens
        localStorage.setItem('authToken', newToken);
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return http(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear storage and redirect to login
        console.error('[HTTP] Token refresh failed:', refreshError.message);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Enhance error with safe message extraction
    if (error.response) {
      const errorData = error.response.data;
      if (typeof errorData === 'object' && errorData !== null) {
        error.message = errorData.message || error.message;
        error.ok = false;
        error.success = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper functions
export const setAuthToken = (token) => {
  if (token) {
    http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('authToken', token);
  } else {
    delete http.defaults.headers.common['Authorization'];
    localStorage.removeItem('authToken');
  }
};

export const clearAuth = () => {
  delete http.defaults.headers.common['Authorization'];
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};


export default http;
