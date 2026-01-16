// src/modules/workspaces/service/activity.service.js
const { WorkspaceActivity, User, Survey } = require('../../../models');
const logger = require('../../../utils/logger');

class ActivityService {
    /**
     * Log workspace activity and emit real-time update
     * @param {Object} params
     * @param {number} params.workspaceId - Workspace ID
     * @param {number} params.userId - Actor User ID
     * @param {string} params.action - Action type (ENUM)
     * @param {string} [params.targetType] - Type of target (user, survey, workspace)
     * @param {number} [params.targetId] - ID of target
     * @param {Object} [params.metadata] - Extra details
     * @param {Object} [params.io] - Socket.IO instance
     */
    async logActivity({ workspaceId, userId, action, targetType = null, targetId = null, metadata = null, io = null }) {
        try {
            const activity = await WorkspaceActivity.create({
                workspace_id: workspaceId,
                user_id: userId,
                action,
                target_type: targetType,
                target_id: targetId,
                metadata
            });

            // Fetch actor details for real-time emission
            const actor = await User.findByPk(userId, {
                attributes: ['id', 'username', 'full_name']
            });

            const activityData = {
                ...activity.toJSON(),
                user: actor
            };

            // Emit real-time update if io is provided
            if (io) {
                const room = `workspace_${workspaceId}`;
                io.to(room).emit('workspaceActivity', activityData);
                io.to(room).emit('workspace_activity', activityData); // Keep legacy for compatibility
                logger.info(`[ActivityService] Emitted activity to room ${room}: ${action}`);
            }

            return activity;
        } catch (error) {
            logger.error('[ActivityService] Error logging activity:', error);
            // Don't throw to prevent breaking main operations
            return null;
        }
    }

    /**
     * Get activities for a workspace
     */
    async getActivities(workspaceId, limit = 20) {
        try {
            return await WorkspaceActivity.findAll({
                where: { workspace_id: workspaceId },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'full_name']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit
            });
        } catch (error) {
            logger.error('[ActivityService] Error fetching activities:', error);
            return [];
        }
    }
}

module.exports = new ActivityService();
