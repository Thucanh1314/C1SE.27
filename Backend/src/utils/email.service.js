// src/utils/email.service.js
const { google } = require('googleapis');
const logger = require('./logger');
const { SystemSetting } = require('../models');
const { encrypt, decrypt } = require('./encryption');

class EmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/admin/gmail/callback'
    );
  }

  /**
   * ADMIN ONLY: Generate Auth URL for connecting Gmail
   */
  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Critical for refresh_token
      prompt: 'consent',      // Force consent to get refresh_token
      scope: scopes
    });
  }

  /**
   * ADMIN ONLY: Handle OAuth Callback and Store Token
   */
  async handleCallback(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        throw new Error('No refresh_token returned. User might have already consented. Try revoking access or forcing consent.');
      }

      // Encrypt and Store refresh_token
      const encryptedToken = encrypt(tokens.refresh_token);

      // Store/Update in SystemSettings
      await SystemSetting.upsert({
        key: 'GMAIL_REFRESH_TOKEN',
        value: encryptedToken,
        description: 'Encrypted OAuth2 Refresh Token for Gmail System Sender'
      });

      // Store Expiry if useful, though we usually just refresh when needed
      // We can also store the 'sender email' by calling userinfo endpoint if we had that scope, 
      // but 'gmail.send' doesn't give profile info. We'll skip validating exact email for now unless we add 'profile' scope.

      logger.info('✅ Gmail refresh token securely stored.');
      return true;
    } catch (error) {
      logger.error('Error handling Gmail callback:', error);
      throw error;
    }
  }

  /**
   * Internal: Get Authenticated Client
   */
  async _getAuthClient() {
    // 1. Check env first (DEV override)
    if (process.env.GOOGLE_GMAIL_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_GMAIL_REFRESH_TOKEN });
      return this.oauth2Client;
    }

    // 2. Check DB
    const setting = await SystemSetting.findByPk('GMAIL_REFRESH_TOKEN');
    if (!setting || !setting.value) {
      throw new Error('Gmail not connected. Please connect Gmail in Admin settings.');
    }

    const refreshToken = decrypt(setting.value);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    return this.oauth2Client;
  }

  /**
   * Send Email using Gmail API
   */
  async sendEmail(to, subject, htmlBody) {
    try {
      const auth = await this._getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      // Create raw email
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        `To: ${to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        htmlBody
      ];
      const message = messageParts.join('\n');

      // Encode the message
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      logger.info(`📧 Email sent to ${to}. MsgId: ${res.data.id}`);
      return { ok: true, id: res.data.id };
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error.message);
      // Fallback or re-throw?
      // If 400 'invalid_grant' -> Token revoked -> Need Admin intervention
      if (error.message.includes('invalid_grant')) {
        logger.error('CRITICAL: Gmail token revoked or expired. Admin must reconnect.');
      }
      throw new Error('Email sending failed');
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email, name) {
    const subject = `Welcome to Our Platform, ${name}!`;
    const html = `
      <h1>Welcome, ${name}!</h1>
      <p>We are excited to have you on board.</p>
      <p>Get started by creating your first survey.</p>
    `;
    return this.sendEmail(email, subject, html).catch(err => {
      logger.warn('Failed to send real welcome email, verify Gmail connection.');
    });
  }

  /**
   * Send password reset email
   */
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, token, frontendUrl) {
    // Ensure no trailing slash
    const baseUrl = (frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const subject = 'Reset Your Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F766E;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #0F766E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #6b7280; word-break: break-all;">${resetUrl}</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 0.875rem; color: #6b7280;">If you didn't request this, you can safely ignore this email. This link will expire in 30 minutes.</p>
      </div>
    `;
    return this.sendEmail(email, subject, html);
  }

  // ... keep existing mocks for notifications if needed, or upgrade them too

  /**
   * Send Feedback Reminder Email
   */
  async sendFeedbackReminderEmail(to, surveyTitle, feedbackLink) {
    const subject = `How was your experience with "${surveyTitle}"?`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>We value your feedback</h2>
        <p>Thank you for completing the survey "${surveyTitle}".</p>
        <p>We would love to hear about your experience taking this survey to help us improve.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${feedbackLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Give Feedback</a>
        </div>
        <p>This will only take a moment and will not share your survey answers.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If the button doesn't work, copy this link: ${feedbackLink}</p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }
}

module.exports = new EmailService();
