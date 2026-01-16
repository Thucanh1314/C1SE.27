/**
 * Middleware to check if user has 'creator' system role
 * Used for features that require creator-level access:
 * - Creating workspaces
 * - Creating templates
 * - Creating surveys
 * - Using AI features (port 8001)
 * - Advanced AI analytics
 */

const logger = require('../utils/logger');
const PermissionLogger = require('../utils/permissionLogger');

/**
 * Check if user is a Creator (System Role)
 */
const requireCreatorRole = async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. User not authenticated.'
        });
    }

    // Check if user has 'creator' role
    if (req.user.role === 'creator') {
        return next();
    }

    // Log unauthorized attempt
    const feature = req.originalUrl.includes('template') ? 'Template' :
                   req.originalUrl.includes('survey') ? 'Survey' :
                   req.originalUrl.includes('workspace') ? 'Workspace' : 'Feature';

    await PermissionLogger.logUnauthorizedAttempt({
        userId: req.user.id,
        userRole: req.user.role,
        workspaceRole: req.workspaceMember?.role,
        workspaceId: req.params.workspaceId || req.body.workspaceId,
        feature,
        action: req.method,
        endpoint: req.originalUrl,
        method: req.method,
        reason: 'CREATOR_ROLE_REQUIRED'
    });

    return res.status(403).json({
        success: false,
        message: 'Vui lòng nâng cấp lên Creator để sử dụng tính năng này',
        reason: 'CREATOR_ROLE_REQUIRED',
        userRole: req.user.role,
        requiredRole: 'creator'
    });
};

/**
 * Check if user is a Creator OR has workspace owner role
 * This combines System Role and Workspace Role
 */
const requireCreatorOrWorkspaceOwner = (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. User not authenticated.'
        });
    }

    // Allow if user is a creator
    if (req.user.role === 'creator') {
        return next();
    }

    // Check if user is workspace owner (if workspaceMember is set by previous middleware)
    if (req.workspaceMember && req.workspaceMember.role === 'owner') {
        return next();
    }

    // Log unauthorized attempt
    logger.warn(`Access denied: User ${req.user.id} attempted creator/owner-only feature`, {
        userId: req.user.id,
        userRole: req.user.role,
        workspaceRole: req.workspaceMember?.role,
        endpoint: req.originalUrl
    });

    return res.status(403).json({
        success: false,
        message: 'Vui lòng nâng cấp lên Creator hoặc liên hệ Workspace Owner',
        reason: 'CREATOR_OR_OWNER_REQUIRED',
        userRole: req.user.role,
        workspaceRole: req.workspaceMember?.role
    });
};

/**
 * Middleware factory to check combined permissions
 * @param {Object} options - Permission options
 * @param {string[]} options.systemRoles - Required system roles (e.g., ['creator'])
 * @param {string[]} options.workspaceRoles - Required workspace roles (e.g., ['owner', 'collaborator'])
 * @param {string} options.feature - Feature name for logging
 */
const requireCombinedRole = (options = {}) => {
    return (req, res, next) => {
        const {
            systemRoles = [],
            workspaceRoles = [],
            feature = 'this feature'
        } = options;

        // Check if user is authenticated
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. User not authenticated.'
            });
        }

        // Check system role
        const hasSystemRole = systemRoles.length === 0 || systemRoles.includes(req.user.role);
        
        // Check workspace role (if workspaceMember is set)
        const hasWorkspaceRole = workspaceRoles.length === 0 || 
            (req.workspaceMember && workspaceRoles.includes(req.workspaceMember.role));

        // User needs BOTH system role AND workspace role
        if (hasSystemRole && hasWorkspaceRole) {
            return next();
        }

        // Log unauthorized attempt
        logger.warn(`Access denied: User ${req.user.id} lacks required permissions for ${feature}`, {
            userId: req.user.id,
            userRole: req.user.role,
            workspaceRole: req.workspaceMember?.role,
            requiredSystemRoles: systemRoles,
            requiredWorkspaceRoles: workspaceRoles,
            endpoint: req.originalUrl
        });

        return res.status(403).json({
            success: false,
            message: `Vui lòng nâng cấp lên Creator để sử dụng ${feature}`,
            reason: 'INSUFFICIENT_PERMISSIONS',
            userRole: req.user.role,
            workspaceRole: req.workspaceMember?.role,
            requiredSystemRoles: systemRoles,
            requiredWorkspaceRoles: workspaceRoles
        });
    };
};

module.exports = {
    requireCreatorRole,
    requireCreatorOrWorkspaceOwner,
    requireCombinedRole
};
