// src/modules/surveys/routes/survey.routes.js
const express = require('express');
const router = express.Router();
const surveyController = require('../controller/survey.controller');
const surveyAccessController = require('../controller/surveyAccess.controller');
const feedbackController = require('../controller/feedback.controller');
const { authenticate, isTeacherOrAdmin } = require('../../../middleware/auth.middleware');
const { requireCreatorRole } = require('../../../middleware/roleCreatorCheck.middleware');

/**
 * @route   GET /api/surveys
 * @desc    Get all surveys (with pagination and filters)
 * @access  Private
 */
router.get('/', authenticate, surveyController.getAllSurveys);

/**
 * @route   GET /api/surveys/my-accessible
 * @desc    Get surveys user has access to (not as creator)
 * @access  Private
 */
router.get('/my-accessible', authenticate, surveyAccessController.getMyAccessibleSurveys);

/**
 * @route   GET /api/surveys/assigned
 * @desc    Get surveys assigned to the current user (pending/completed)
 * @access  Private
 */
router.get('/assigned', authenticate, surveyController.getAssignedSurveys);

/**
 * @route   GET /api/surveys/:id
 * @desc    Get survey by ID
 * @access  Private
 */
router.get('/:id', authenticate, surveyController.getSurveyById);

/**
 * @route   GET /api/surveys/:id/stats
 * @desc    Get survey statistics
 * @access  Private
 */
router.get('/:id/stats', authenticate, surveyController.getSurveyStats);

/**
 * @route   POST /api/surveys
 * @desc    Create new survey
 * @access  Private (Creator only - requires system role 'creator')
 */
router.post('/', authenticate, requireCreatorRole, surveyController.createSurvey);

// Update survey (Creator only)
router.put('/:id', authenticate, requireCreatorRole, surveyController.updateSurvey);

// Bulk delete surveys (Creator only)
router.delete('/bulk', authenticate, requireCreatorRole, surveyController.deleteSurveys);

// Delete survey (Creator only)
router.delete('/:id', authenticate, requireCreatorRole, surveyController.deleteSurvey);

// Publish survey (Creator only)
router.post('/:id/publish', authenticate, requireCreatorRole, surveyController.publishSurvey);

// Close survey (Creator only)
router.post('/:id/close', authenticate, requireCreatorRole, surveyController.closeSurvey);

// Update survey status (Creator only)
router.patch('/:id/status', authenticate, requireCreatorRole, surveyController.updateSurveyStatus);

// Restore archived survey (Creator only)
router.patch('/:id/restore', authenticate, requireCreatorRole, surveyController.restoreSurvey);

// Survey Access Routes

/**
 * @route   POST /api/surveys/:id/access
 * @desc    Grant access to a survey
 * @access  Private (Owner/Admin only)
 */
router.post('/:id/access', authenticate, surveyAccessController.grantAccess);

/**
 * @route   GET /api/surveys/:id/access
 * @desc    Get access grants for a survey
 * @access  Private (Owner/Admin only)
 */
router.get('/:id/access', authenticate, surveyAccessController.getSurveyAccessGrants);

/**
 * @route   DELETE /api/surveys/:id/access/:userId
 * @desc    Revoke access to a survey
 * @access  Private (Owner/Admin only)
 */
router.delete('/:id/access/:userId', authenticate, surveyAccessController.revokeAccess);

/**
 * @route   GET /api/surveys/:id/my-access
 * @desc    Get user's access level for a specific survey
 * @access  Private
 */
router.get('/:id/my-access', authenticate, surveyAccessController.getMyAccess);

// Survey Invite Routes
const surveyInviteController = require('../controller/surveyInvite.controller');

/**
 * @route   POST /api/modules/surveys/:id/invites
 * @desc    Create invites for a survey
 * @access  Private (Owner only)
 */
router.post('/:id/invites', authenticate, surveyInviteController.createInvites);

/**
 * @route   GET /api/modules/surveys/:id/invites
 * @desc    Get all invites for a survey
 * @access  Private (Owner only)
 */
router.get('/:id/invites', authenticate, surveyInviteController.getInvites);

/**
 * @route   GET /api/modules/surveys/:id/invites/stats
 * @desc    Get invite statistics
 * @access  Private (Owner only)
 */
router.get('/:id/invites/stats', authenticate, surveyInviteController.getInviteStats);

/**
 * @route   GET /api/modules/invites/:token/validate
 * @desc    Validate invite token (public)
 * @access  Public
 */
router.get('/invites/:token/validate', surveyInviteController.validateInvite);

/**
 * @route   POST /api/modules/invites/:token/accept
 * @desc    Accept invite token (public)
 * @access  Public
 */
router.post('/invites/:token/accept', surveyInviteController.acceptInvite);

/**
 * @route   DELETE /api/modules/invites/:id
 * @desc    Revoke invite
 * @access  Private (Owner only)
 */
router.delete('/invites/:id', authenticate, surveyInviteController.revokeInvite);

// Feedback Routes

/**
 * @route   POST /api/modules/surveys/:surveyId/feedback
 * @desc    Submit feedback for a survey (Public or Internal)
 * @access  Public (Authenticated for Internal source)
 */
// Note: We use :surveyId here to match the controller expectation, but the main router uses :id.
// Express router merges params if configured, but let's stick to standard. 
// If this router is mounted at /api/modules/surveys, then path is /:id/feedback
router.post('/:surveyId/feedback', async (req, res, next) => {
    // Optional Authentication check if internal
    if (req.body.source === 'internal') {
        return authenticate(req, res, next);
    }
    next();
}, feedbackController.submitFeedback);

/**
 * @route   GET /api/modules/surveys/:surveyId/feedback/stats
 * @desc    Get feedback statistics
 * @access  Private (Owner/Admin only)
 */
router.get('/:surveyId/feedback/stats', authenticate, feedbackController.getFeedbackStats);

/**
 * @route   POST /api/modules/surveys/feedback/reminders
 * @desc    Trigger feedback reminders (Admin only)
 * @access  Private (Admin only)
 */
router.post('/feedback/reminders', authenticate, (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    next();
}, feedbackController.triggerReminders);

module.exports = router;
