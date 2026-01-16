const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../../../models');
const emailService = require('../../../services/email.service');
const { Op } = require('sequelize');

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { username, email, password, full_name, role = 'user' } = userData;

    // Check if user exists
    logger.info('[AuthService] Checking if user exists:', { username, email });
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      logger.warn('[AuthService] Registration conflict found:', {
        usernameMatched: existingUser.username === username,
        emailMatched: existingUser.email === email,
        existingId: existingUser.id
      });
      throw new Error('Username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      full_name,
      role
    });

    // Send welcome email (async, don't block)
    emailService.sendWelcomeEmail(email, full_name || username).catch(err => {
      console.error('Failed to send welcome email', err);
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Return user without password
    const userResponse = user.toJSON();
    delete userResponse.password;

    return {
      user: userResponse,
      ...tokens
    };
  }

  /**
   * Login user
   */
  async login(identifier, password) {
    // Find user by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: identifier },
          { email: identifier }
        ]
      }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Return user without password
    const userResponse = user.toJSON();
    delete userResponse.password;

    return {
      user: userResponse,
      ...tokens
    };
  }

  /**
   * Forgot Password - Request Reset Link
   */
  /**
   * Forgot Password - Request Reset Link
   */
  async forgotPassword(email) {
    // Always return success to prevent email enumeration
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Return generic success logic
      return { message: 'If an account exists, a reset email has been sent.' };
    }

    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    // Save token to User model
    user.reset_password_token = hashedToken;
    user.reset_password_expires = expiresAt;
    await user.save();

    // Send email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const emailSent = await emailService.sendPasswordResetEmail(email, token, frontendUrl);

    if (!emailSent) {
      console.error('CRITICAL: Failed to send password reset email to existing user');
      // In production, you might want to throw error here or revert token, 
      // but security best practice is often to not reveal failure if possible,
      // though typically for email system failure we might encourage retry.
      // We will suppress error to User but log it.
    }

    return { message: 'If an account exists, a reset email has been sent.' };
  }

  /**
   * Reset Password with Token
   */
  async resetPassword(token, newPassword) {
    // Password Strength Validation
    // At least 8 chars, 1 upper, 1 lower, 1 number, 1 special
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,64}$/;

    if (!strongPasswordRegex.test(newPassword)) {
      throw new Error('Password must be 8-64 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        reset_password_token: hashedToken,
        reset_password_expires: { [Op.gt]: new Date() } // Expires > Now
      }
    });

    if (!user) {
      throw new Error('Token is invalid or has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear tokens
    user.password = hashedPassword;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    return { message: 'Password has been reset successfully.' };
  }

  /**
   * Generate JWT tokens
   */
  generateTokens(user) {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    return { token, refreshToken };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

      const user = await User.findByPk(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.toJSON();
  }
  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error('Incorrect current password');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return true;
  }

  /**
   * Handle Google Auth (Find or Create User)
   */
  /**
   * Handle Google Auth (Find or Create User)
   */
  async handleGoogleAuth(profile) {
    console.log('[GOOGLE_OAUTH] Service handling profile:', { email: profile.email, sub: profile.sub });

    const { email, name, sub } = profile; // Use sub as provider_id

    if (!email) {
      console.error('[GOOGLE_OAUTH] Missing email in profile');
      throw new Error('MissingEmail');
    }

    // 1. Check for existing user
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // 2. CREATE NEW USER
      console.log(`[GOOGLE_OAUTH] Creating new user: ${email}`);
      try {
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        // Generate unique username
        let username = email.split('@')[0];
        // Ensure uniqueness
        let existingUsername = await User.findOne({ where: { username } });
        while (existingUsername) {
          username = `${email.split('@')[0]}_${crypto.randomInt(1000, 99999)}`;
          existingUsername = await User.findOne({ where: { username } });
        }

        user = await User.create({
          username,
          email,
          password: hashedPassword,
          full_name: name || username, // Fallback if name missing
          role: 'user',
          auth_provider: 'google',
          provider_id: sub
        });

        console.log(`[GOOGLE_OAUTH] User created with ID: ${user.id}`);

        // Send welcome email
        emailService.sendWelcomeEmail(email, name || username).catch(console.error);

      } catch (dbError) {
        console.error('[GOOGLE_OAUTH] DB Create Failed:', dbError);
        throw new Error('DbCreateFailed');
      }

    } else {
      // 3. LINK EXISTING USER
      console.log(`[GOOGLE_OAUTH] Found existing user: ${user.id}`);
      try {
        // If user exists but is not linked to Google yet, link them.
        if (!user.provider_id) {
          console.log(`[GOOGLE_OAUTH] Linking existing user: ${email}`);
          user.provider_id = sub;
          if (user.auth_provider === 'local') {
            user.auth_provider = 'google';
          }
          await user.save();
          console.log('[GOOGLE_OAUTH] User linked successfully');
        }
      } catch (linkError) {
        console.error('[GOOGLE_OAUTH] DB Link Failed:', linkError);
        throw new Error('DbLinkFailed');
      }
    }

    try {
      // Generate tokens
      const tokens = this.generateTokens(user);
      console.log('[GOOGLE_OAUTH] Tokens generated');

      return {
        user: user.toJSON(),
        ...tokens
      };
    } catch (tokenError) {
      console.error('[GOOGLE_OAUTH] Token Issue Failed:', tokenError);
      throw new Error('SessionIssueFailed');
    }
  }

  /**
   * Request/Upgrade to Creator Role
   */
  async requestOrUpgradeToCreator(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw new Error('User not found');

    // Policy: Allow upgrade if currently 'user'. 
    // Admin should not be downgraded here.
    if (user.role === 'admin') {
      throw new Error('Admins cannot downgrade via this flow');
    }

    if (user.role === 'creator') {
      return { message: 'Already a creator', user };
    }

    // Auto-approve policy for MVP (or check if email verified)
    user.role = 'creator';
    await user.save();

    console.log(`[AUTH] User ${userId} upgraded to creator`);
    return { message: 'Upgraded to creator successfully', user };
  }
}

module.exports = new AuthService();
