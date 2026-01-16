// src/modules/auth-rbac/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../../../middleware/rateLimiter.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, authController.login);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', authLimiter, authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', authenticate, authController.changePassword);

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth
 * @access  Public
 */
router.get('/google', authController.googleAuth);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Handle Google Auth Callback
 * @access  Public
 */
router.get('/google/callback', authController.googleCallback);

/**
 * @route   POST /api/auth/creator-upgrade
 * @desc    Upgrade current user to creator
 * @access  Private
 */
router.post('/creator-upgrade', authenticate, authController.upgradeToCreator);

module.exports = router;
