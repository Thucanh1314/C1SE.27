const { WorkspaceMember } = require('../models');
const logger = require('../utils/logger');

/**
 * Workspace permission levels
 */
const WORKSPACE_ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    EDITOR: 'editor',
    MEMBER: 'member',
    RESPONDENT: 'respondent'
};

/**
 * Permission matrix for workspace operations
 */
const PERMISSIONS = {
    // Survey operations
    ADD_SURVEY: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.EDITOR],
    EDIT_SURVEY: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.EDITOR],
    DELETE_SURVEY: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN],
    VIEW_SURVEY: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.EDITOR, WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.RESPONDENT],

    // Member operations
    INVITE_MEMBER: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN],
    REMOVE_MEMBER: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN],
    CHANGE_ROLE: [WORKSPACE_ROLES.OWNER],

    // Workspace operations
    EDIT_WORKSPACE: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN],
    DELETE_WORKSPACE: [WORKSPACE_ROLES.OWNER],

    // Response operations
    SUBMIT_RESPONSE: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.EDITOR, WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.RESPONDENT],
    VIEW_RESPONSES: [WORKSPACE_ROLES.OWNER, WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.EDITOR]
};

/**
 * Check if user has permission for workspace operation
 */
async function checkWorkspacePermission(userId, workspaceId, permission) {
    try {
        // Get user's role in workspace
        const member = await WorkspaceMember.findOne({
            where: {
                user_id: userId,
                workspace_id: workspaceId,
                is_active: true
            }
        });

        if (!member) {
            return {
                hasPermission: false,
                reason: 'User is not a member of this workspace'
            };
        }

        // Check if role has permission
        const allowedRoles = PERMISSIONS[permission];
        if (!allowedRoles) {
            return {
                hasPermission: false,
                reason: 'Invalid permission type'
            };
        }

        const hasPermission = allowedRoles.includes(member.role);

        return {
            hasPermission,
            role: member.role,
            reason: hasPermission ? null : `Role '${member.role}' does not have permission to ${permission}`
        };
    } catch (error) {
        logger.error('Error checking workspace permission:', error);
        return {
            hasPermission: false,
            reason: 'Error checking permissions'
        };
    }
}

/**
 * Middleware to require workspace permission
 */
function requireWorkspacePermission(permission) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            const workspaceId = req.params.workspaceId || req.body.workspaceId || req.body.workspace_id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            if (!workspaceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Workspace ID required'
                });
            }

            const permissionCheck = await checkWorkspacePermission(userId, workspaceId, permission);

            if (!permissionCheck.hasPermission) {
                return res.status(403).json({
                    success: false,
                    message: permissionCheck.reason || 'Permission denied',
                    requiredPermission: permission,
                    userRole: permissionCheck.role
                });
            }

            // Attach role to request for later use
            req.workspaceRole = permissionCheck.role;
            next();
        } catch (error) {
            logger.error('Workspace permission middleware error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
}

module.exports = {
    WORKSPACE_ROLES,
    PERMISSIONS,
    checkWorkspacePermission,
    requireWorkspacePermission
};
