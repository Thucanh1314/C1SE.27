// src/modules/permissions/routes/permission.routes.js
const express = require('express');
const router = express.Router();
const permissionController = require('../controller/permission.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

/**
 * @route   GET /api/modules/permissions/my
 * @desc    Get current user's comprehensive permissions
 * @access  Private
 */
router.get('/my', authenticate, permissionController.getUserPermissions);

/**
 * @route   GET /api/modules/permissions/workspace/:workspaceId
 * @desc    Get user's permissions for specific workspace
 * @access  Private
 */
router.get('/workspace/:workspaceId', authenticate, permissionController.getUserPermissions);

/**
 * @route   POST /api/modules/permissions/check
 * @desc    Check if user has specific permission
 * @access  Private
 * @body    { feature: string, action: string }
 */
router.post('/check', authenticate, permissionController.checkPermission);

/**
 * @route   GET /api/modules/permissions/ui-config
 * @desc    Get UI visibility configuration for user
 * @access  Private
 */
router.get('/ui-config', authenticate, permissionController.getUIConfig);

/**
 * @route   GET /api/modules/permissions/upgrade-info
 * @desc    Get information about upgrade requirements
 * @access  Private
 */
router.get('/upgrade-info', authenticate, permissionController.getUpgradeInfo);

module.exports = router;
