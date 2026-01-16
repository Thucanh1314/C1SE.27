// src/modules/surveys/routes/surveyInvite.routes.js
const express = require('express');
const router = express.Router();
const surveyInviteController = require('../controller/surveyInvite.controller');
const { authenticate } = require('../../../middleware/auth.middleware');

// Public route - validate invite token
router.get('/invites/:token/validate', surveyInviteController.validateInvite);
router.post('/invites/:token/accept', surveyInviteController.acceptInvite);

// Protected routes - require authentication
router.post('/surveys/:id/invites', authenticate, surveyInviteController.createInvites);
router.get('/surveys/:id/invites', authenticate, surveyInviteController.getInvites);
router.get('/surveys/:id/invites/stats', authenticate, surveyInviteController.getInviteStats);
router.delete('/invites/:id', authenticate, surveyInviteController.revokeInvite);

module.exports = router;
