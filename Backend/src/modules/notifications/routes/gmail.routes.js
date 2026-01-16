const express = require('express');
const router = express.Router();
const gmailController = require('../controller/gmail.controller');
// We need admin middleware. Assuming authenticate + checkRole('admin')
// For now, let's use a placeholder or generic 'authenticate' if available in the module.
// Checking imports...
const { authenticate, isAdmin } = require('../../auth-rbac/middleware/auth.middleware');

// Routes
// Note: Callback is public because Google redirects there. We could validate state but we'll keep it simple for now.
router.get('/callback', gmailController.callback);

// Admin Protected
router.get('/connect', authenticate, isAdmin, gmailController.connect);
router.get('/status', authenticate, isAdmin, gmailController.status);
router.post('/test', authenticate, isAdmin, gmailController.sendTestEmail);

module.exports = router;
