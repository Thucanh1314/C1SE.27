const upgradeRequestService = require('../service/upgradeRequest.service');

class UpgradeRequestController {
    /**
     * Create a request (User)
     */
    async createRequest(req, res) {
        try {
            const { user } = req;
            const result = await upgradeRequestService.createRequest(user.id, req.body);
            res.status(201).json({
                success: true,
                message: 'Upgrade request submitted successfully.',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get my request status (User)
     */
    async getMyRequest(req, res) {
        try {
            const { user } = req;
            const result = await upgradeRequestService.getMyRequest(user.id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Get all requests (Admin)
     */
    async getAllRequests(req, res) {
        try {
            const { page, limit, status } = req.query;
            const result = await upgradeRequestService.getAllRequests({ page, limit, status });
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Approve a request (Admin)
     */
    async approveRequest(req, res) {
        try {
            const { id } = req.params;
            const { admin_comment } = req.body;
            const result = await upgradeRequestService.approveRequest(id, req.user.id, admin_comment);
            res.status(200).json({
                success: true,
                message: 'Request approved. User upgraded to Creator.',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * Reject a request (Admin)
     */
    async rejectRequest(req, res) {
        try {
            const { id } = req.params;
            const { admin_comment } = req.body;
            const result = await upgradeRequestService.rejectRequest(id, req.user.id, admin_comment);
            res.status(200).json({
                success: true,
                message: 'Request rejected.',
                data: result
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new UpgradeRequestController();
