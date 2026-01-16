// src/modules/auth-rbac/controller/auth.controller.js
const authService = require('../service/auth.service');
const logger = require('../../../utils/logger');
const { google } = require('googleapis');

class AuthController {
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const { username, email, password, full_name } = req.body;

      // Validation
      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      // Security: Force role to 'user' for public registration
      // If you need admin creation, use a separate seeded admin or internal route
      const role = 'user';

      const result = await authService.register({
        username,
        email,
        password,
        full_name,
        role
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      console.error('[AuthController.register] FULL ERROR:', error);
      logger.error('Register error:', {
        message: error.message,
        stack: error.stack,
        details: error.errors // Sequelize validation errors
      });
      res.status(400).json({
        success: false,
        message: error.message || 'Error registering user'
      });
    }
  }

  /**
   * Login user
   */
  async login(req, res) {
    try {
      const { username, email, password } = req.body;

      // Accept either username or email
      const identifier = username || email;

      if (!identifier || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username/email and password are required'
        });
      }

      const result = await authService.login(identifier, password);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials'
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const tokens = await authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens
      });
    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid refresh token'
      });
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const profile = await authService.getProfile(req.user.id);

      res.status(200).json({
        success: true,
        data: { user: profile }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error fetching profile'
      });
    }
  }

  /**
   * Logout (client-side token removal, but can be extended)
   */
  async logout(req, res) {
    try {
      // In a real system, you might blacklist the token here
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }
  }
  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      await authService.changePassword(req.user.id, oldPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Error changing password'
      });
    }
  }
  /**
   * Forgot Password
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const result = await authService.forgotPassword(email);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Error processing request' });
    }
  }

  /**
   * Reset Password
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required' });
      }

      const result = await authService.resetPassword(token, newPassword);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({ success: false, message: error.message || 'Error resetting password' });
    }
  }

  /**
   * Google Auth - Initiate
   */
  async googleAuth(req, res) {
    try {
      // 1. Determine Redirect URI with strict fallback priority
      // Priority: ENV > Default (localhost:5000)
      const redirectUri = process.env.GOOGLE_AUTH_CALLBACK_URL ||
        process.env.GOOGLE_REDIRECT_URI ||
        'http://localhost:5000/api/auth/google/callback';

      console.log("[GOOGLE_OAUTH] redirect_uri=", redirectUri);

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      const scopes = [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ];

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
      });

      res.redirect(url);
    } catch (error) {
      logger.error('Google Auth Init Error:', error);
      res.status(500).send('Authentication failed');
    }
  }

  /**
   * Google Auth - Callback
   */
  async googleCallback(req, res) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    try {
      console.log('[GOOGLE_OAUTH] callback hit');
      const { code } = req.query;

      if (!code) {
        throw new Error('NoCodeProvided');
      }

      // Must match googleAuth EXACTLY
      const redirectUri = process.env.GOOGLE_AUTH_CALLBACK_URL ||
        process.env.GOOGLE_REDIRECT_URI ||
        'http://localhost:5000/api/auth/google/callback';

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      console.log('[GOOGLE_OAUTH] exchanging code for tokens');
      const { tokens } = await oauth2Client.getToken(code);
      console.log('[GOOGLE_OAUTH] token exchange ok');

      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });

      console.log('[GOOGLE_OAUTH] fetching user profile');
      const { data } = await oauth2.userinfo.get();
      console.log(`[GOOGLE_OAUTH] profile received: email=${data.email || 'missing'} sub=${data.id || 'missing'}`);

      // Handle login/register
      const result = await authService.handleGoogleAuth({
        email: data.email,
        name: data.name,
        sub: data.id, // Google returns id as sub
        picture: data.picture
      });
      console.log(`[GOOGLE_OAUTH] db user resolved: id=${result.user.id}`);
      console.log('[GOOGLE_OAUTH] session issued: jwt=yes');

      // Redirect to frontend with tokens
      // Determine Role-Based Redirect Path
      const redirectPath = result.user.role === 'admin' ? '/admin/dashboard' : '/dashboard';

      console.log(`[GOOGLE_OAUTH] redirecting to ${frontendUrl}/auth/callback`);

      // Pass redirectPath in query param
      res.redirect(`${frontendUrl}/auth/callback?token=${result.token}&refreshToken=${result.refreshToken}&redirect=${encodeURIComponent(redirectPath)}`);

    } catch (error) {
      console.error("[GOOGLE_OAUTH] callback failed:", error.message, error.stack);

      let reason = 'Unknown';
      if (error.message === 'MissingEmail') reason = 'MissingEmail';
      else if (error.message === 'DbCreateFailed') reason = 'DbCreateFailed';
      else if (error.message === 'DbLinkFailed') reason = 'DbLinkFailed';
      else if (error.message === 'SessionIssueFailed') reason = 'SessionIssueFailed';
      else if (error.message.includes('NoCodeProvided')) reason = 'NoCodeProvided';
      else if (error.message.includes('invalid_grant')) reason = 'TokenExchangeFailed';

      // Redirect to login with error
      res.redirect(`${frontendUrl}/login?error=GoogleAuthFailed&reason=${reason}`);
    }
  }

  /**
   * Upgrade to Creator
   */
  async upgradeToCreator(req, res) {
    try {
      const result = await authService.requestOrUpgradeToCreator(req.user.id);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Upgrade creator error:', error);
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();
