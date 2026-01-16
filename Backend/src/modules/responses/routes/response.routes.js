// src/modules/responses/routes/response.routes.js
const express = require('express');
const router = express.Router();
const responseController = require('../controller/response.controller');
const { authenticate, isCreatorOrAdmin, optionalAuthenticate } = require('../../../middleware/auth.middleware');

/**
 * @route   POST /api/responses
 * @desc    Submit survey response
 * @access  Private
 */
router.post('/', authenticate, responseController.submitResponse);

/**
 * @route   GET /api/responses/my-responses
 * @desc    Get user's own responses
 * @access  Private
 */
router.get('/my-responses', authenticate, responseController.getUserResponses);

/**
 * @route   GET /api/responses/my-responses/:id
 * @desc    Get detailed user response with all answers
 * @access  Private (own responses only)
 */
router.get('/my-responses/:id', authenticate, responseController.getUserResponseDetail);

/**
 * @route   GET /api/responses/:id
 * @desc    Get response by ID
 * @access  Private
 */
router.get('/:id', authenticate, responseController.getResponseById);

/**
 * @route   GET /api/responses/survey/:survey_id
 * @desc    Get all responses for a survey
 * @access  Private (Creator/Admin only)
 */
router.get('/survey/:survey_id', authenticate, responseController.getResponsesBySurvey);

/**
 * @route   DELETE /api/responses/:id
 * @desc    Delete response
 * @access  Private (Owner/Admin only)
 */
router.delete('/:id', authenticate, responseController.deleteResponse);

/**
 * @route   POST /api/responses/public/:token
 * @desc    Submit public/anonymous response via collector token
 * @access  Public (no authentication required)
 */
router.post('/public/:token', optionalAuthenticate, responseController.submitPublicResponse);

/**
 * @route   POST /api/responses/start/:id
 * @desc    Start survey session (for drop-off tracking)
 * @access  Public
 */
router.post('/start/:id', optionalAuthenticate, responseController.startSession);

/**
 * @route   PUT /api/responses/:id/complete
 * @desc    Fix stuck response by marking as completed
 * @access  Private (Admin only)
 */
router.put('/:id/complete', authenticate, responseController.completeResponse);

// TEMP FIX removed
module.exports = router;
