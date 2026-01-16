const express = require('express');
const router = express.Router();
const upgradeRequestController = require('../controller/upgradeRequest.controller');
const authMiddleware = require('../../../middleware/auth.middleware');
const roleMiddleware = require('../../../middleware/role.middleware');

// User Routes
router.post(
    '/upgrade-request',
    authMiddleware.authenticate,
    upgradeRequestController.createRequest.bind(upgradeRequestController)
);

router.get(
    '/upgrade-request/me',
    authMiddleware.authenticate,
    upgradeRequestController.getMyRequest.bind(upgradeRequestController)
);

// Admin Routes
router.get(
    '/admin/upgrade-requests',
    authMiddleware.authenticate,
    roleMiddleware(['admin']),
    upgradeRequestController.getAllRequests.bind(upgradeRequestController)
);

router.post(
    '/admin/upgrade-requests/:id/approve',
    authMiddleware.authenticate,
    roleMiddleware(['admin']),
    upgradeRequestController.approveRequest.bind(upgradeRequestController)
);

router.post(
    '/admin/upgrade-requests/:id/reject',
    authMiddleware.authenticate,
    roleMiddleware(['admin']),
    upgradeRequestController.rejectRequest.bind(upgradeRequestController)
);

module.exports = router;
