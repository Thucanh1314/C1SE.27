/**
 * Utility for logging unauthorized access attempts
 * Logs to both workspace_activities and audit_logs
 */

const logger = require('../utils/logger');
const db = require('../config/database');

class PermissionLogger {
    /**
     * Log unauthorized access attempt
     * @param {Object} options - Logging options
     * @param {number} options.userId - User ID attempting access
     * @param {string} options.userRole - User's system role
     * @param {string} options.workspaceRole - User's workspace role (if applicable)
     * @param {number} options.workspaceId - Workspace ID (if applicable)
     * @param {string} options.feature - Feature being accessed
     * @param {string} options.action - Action being attempted
     * @param {string} options.endpoint - API endpoint
     * @param {string} options.method - HTTP method
     * @param {string} options.reason - Reason for denial
     */
    static async logUnauthorizedAttempt(options) {
        const {
            userId,
            userRole,
            workspaceRole = null,
            workspaceId = null,
            feature,
            action,
            endpoint,
            method,
            reason
        } = options;

        const timestamp = new Date();
        const logMessage = `User ${userId} (role: ${userRole}${workspaceRole ? `, workspace: ${workspaceRole}` : ''}) attempted unauthorized access to ${feature}`;

        // Log to application logger
        logger.warn(logMessage, {
            userId,
            userRole,
            workspaceRole,
            workspaceId,
            feature,
            action,
            endpoint,
            method,
            reason,
            timestamp
        });

        try {
            // Log to audit_logs table
            await this.logToAuditLogs({
                userId,
                action: `UNAUTHORIZED_${action.toUpperCase()}`,
                entity_type: feature,
                entity_id: workspaceId,
                details: JSON.stringify({
                    userRole,
                    workspaceRole,
                    endpoint,
                    method,
                    reason
                }),
                timestamp
            });

            // Log to workspace_activities if workspace is involved
            if (workspaceId) {
                await this.logToWorkspaceActivities({
                    workspaceId,
                    userId,
                    activityType: 'ACCESS_DENIED',
                    description: `Cảnh báo: ${reason}`,
                    metadata: JSON.stringify({
                        feature,
                        action,
                        userRole,
                        workspaceRole,
                        endpoint
                    }),
                    timestamp
                });
            }
        } catch (error) {
            logger.error('Failed to log unauthorized attempt to database:', error);
        }
    }

    /**
     * Log successful Creator-level action
     * @param {Object} options - Logging options
     */
    static async logCreatorAction(options) {
        const {
            userId,
            userRole,
            workspaceId = null,
            feature,
            action,
            entityId = null,
            details = {}
        } = options;

        const timestamp = new Date();

        try {
            // Log to audit_logs
            await this.logToAuditLogs({
                userId,
                action: action.toUpperCase(),
                entity_type: feature,
                entity_id: entityId || workspaceId,
                details: JSON.stringify({
                    userRole,
                    ...details
                }),
                timestamp
            });

            // Log to workspace_activities if workspace is involved
            if (workspaceId) {
                await this.logToWorkspaceActivities({
                    workspaceId,
                    userId,
                    activityType: action.toUpperCase(),
                    description: `${action} ${feature}`,
                    metadata: JSON.stringify(details),
                    timestamp
                });
            }
        } catch (error) {
            logger.error('Failed to log creator action to database:', error);
        }
    }

    /**
     * Insert into audit_logs table
     */
    static async logToAuditLogs(data) {
        const query = `
            INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.query(query, [
            data.userId,
            data.action,
            data.entity_type,
            data.entity_id,
            data.details,
            data.timestamp
        ]);
    }

    /**
     * Insert into workspace_activities table
     */
    static async logToWorkspaceActivities(data) {
        const query = `
            INSERT INTO workspace_activities (workspace_id, user_id, activity_type, description, metadata, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        await db.query(query, [
            data.workspaceId,
            data.userId,
            data.activityType,
            data.description,
            data.metadata,
            data.timestamp
        ]);
    }

    /**
     * Log AI access attempt (Port 8001)
     */
    static async logAIAccessAttempt(userId, userRole, allowed, feature = 'AI_API') {
        const timestamp = new Date();

        if (!allowed) {
            await this.logUnauthorizedAttempt({
                userId,
                userRole,
                feature,
                action: 'AI_ACCESS',
                endpoint: '/api/ai/*',
                method: 'POST',
                reason: 'User không có quyền Creator để sử dụng AI'
            });
        } else {
            logger.info(`User ${userId} (Creator) successfully accessed AI features`);
        }
    }
}

module.exports = PermissionLogger;
