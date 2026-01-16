const { CreatorUpgradeRequest, User, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const notificationService = require('../../notifications/service/notification.service');

class UpgradeRequestService {
    /**
     * Create a new upgrade request
     */
    async createRequest(userId, data) {
        const { reason, intended_usage } = data;

        // Check if user already has a pending request
        const existingRequest = await CreatorUpgradeRequest.findOne({
            where: {
                user_id: userId,
                status: 'pending'
            }
        });

        if (existingRequest) {
            throw new Error('You already have a pending upgrade request.');
        }

        // Check if user is already a creator or admin
        const user = await User.findByPk(userId);
        if (user.role === 'creator' || user.role === 'admin') {
            throw new Error('You are already a Creator or Admin.');
        }

        return await CreatorUpgradeRequest.create({
            user_id: userId,
            reason,
            intended_usage: intended_usage || 'other',
            status: 'pending'
        });
    }

    /**
     * Get request status for current user
     */
    async getMyRequest(userId) {
        return await CreatorUpgradeRequest.findOne({
            where: { user_id: userId },
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Get all requests (Admin only)
     */
    async getAllRequests(options = {}) {
        const { status, page = 1, limit = 10 } = options;
        const offset = (page - 1) * limit;
        const where = {};

        if (status) {
            where.status = status;
        }

        const { count, rows } = await CreatorUpgradeRequest.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'email', 'full_name']
                },
                {
                    model: User,
                    as: 'reviewer',
                    attributes: ['id', 'full_name']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return {
            requests: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        };
    }

    /**
     * Approve a request with database transaction for data integrity
     */
    async approveRequest(requestId, adminId, adminComment) {
        // Use transaction to ensure atomicity
        const transaction = await sequelize.transaction();
        
        try {
            const request = await CreatorUpgradeRequest.findByPk(requestId, { transaction });
            if (!request) throw new Error('Request not found');
            if (request.status !== 'pending') throw new Error('Request is not pending');

            // Update Request
            request.status = 'approved';
            request.reviewed_by = adminId;
            request.reviewed_at = new Date();
            request.admin_comment = adminComment;
            await request.save({ transaction });

            // Update User Role - CRITICAL: Must be atomic with request update
            const user = await User.findByPk(request.user_id, { transaction });
            if (!user) throw new Error('User not found');
            
            user.role = 'creator';
            await user.save({ transaction });

            // Commit transaction
            await transaction.commit();
            
            console.log(`✅ [UpgradeRequest] Successfully upgraded user ${user.email} to creator role`);
        } catch (error) {
            // Rollback transaction on error
            await transaction.rollback();
            console.error(`❌ [UpgradeRequest] Failed to approve request ${requestId}:`, error.message);
            throw error;
        }

        // Create Notification
        try {
            await notificationService.createNotification({
                userId: request.user_id,
                type: 'role_upgraded',
                title: 'You are now a Creator',
                message: 'Click to start creating surveys.',
                actionUrl: '/surveys',
                actorId: adminId,
                relatedUserId: request.user_id
            });
        } catch (notifError) {
            console.error('[UpgradeRequest] Failed to create notification:', notifError.message);
        }

        // Emit Socket.IO event for real-time update
        try {
            const io = require('../../../config/socket.config').getIO();
            if (io) {
                io.to(`user_${request.user_id}`).emit('role_updated', {
                    userId: request.user_id,
                    newRole: 'creator'
                });
            }
        } catch (socketError) {
            console.error('[UpgradeRequest] Failed to emit socket event:', socketError.message);
        }

        return request;
    }

    /**
     * Reject a request with transaction
     */
    async rejectRequest(requestId, adminId, adminComment) {
        const transaction = await sequelize.transaction();
        
        try {
            const request = await CreatorUpgradeRequest.findByPk(requestId, { transaction });
            if (!request) throw new Error('Request not found');
            if (request.status !== 'pending') throw new Error('Request is not pending');

            request.status = 'rejected';
            request.reviewed_by = adminId;
            request.reviewed_at = new Date();
            request.admin_comment = adminComment;
            await request.save({ transaction });
            
            await transaction.commit();
            console.log(`✅ [UpgradeRequest] Successfully rejected request ${requestId}`);
        } catch (error) {
            await transaction.rollback();
            console.error(`❌ [UpgradeRequest] Failed to reject request ${requestId}:`, error.message);
            throw error;
        }

        // Create Notification for rejection
        try {
            await notificationService.createNotification({
                userId: request.user_id,
                type: 'upgrade_rejected',
                title: 'Creator Request Update',
                message: 'Your creator upgrade request was not approved.',
                actionUrl: '/profile',
                actorId: adminId,
                relatedUserId: request.user_id
            });
        } catch (notifError) {
            console.error('[UpgradeRequest] Failed to create rejection notification:', notifError.message);
        }

        return request;
    }
}

module.exports = new UpgradeRequestService();
