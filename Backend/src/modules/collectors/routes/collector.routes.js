// src/modules/collectors/routes/collector.routes.js
const express = require('express');
const router = express.Router();
const collectorController = require('../controller/collector.controller');
const { authenticate, isTeacherOrAdmin } = require('../../../middleware/auth.middleware');

/**
 * @route   GET /api/collectors/survey/:survey_id
 * @desc    Get collectors for a survey
 * @access  Private (Creator/Admin only)
 */
router.get('/survey/:survey_id', authenticate, collectorController.getCollectorsBySurvey);

/**
 * @route   GET /api/collectors?survey_id=X
 * @desc    Get collectors for a survey (query param version for backward compatibility)
 * @access  Private (Creator/Admin only)
 */
router.get('/', authenticate, collectorController.getCollectorsBySurveyQuery);

/**
 * @route   POST /api/collectors/survey/:survey_id
 * @desc    Create collector for survey
 * @access  Private (Creator/Admin only)
 */
router.post('/survey/:survey_id', authenticate, collectorController.createCollector);

/**
 * @route   GET /api/collectors/token/:token
 * @desc    Get collector and survey by token (public)
 * @access  Public
 */
router.get('/token/:token', collectorController.getCollectorByToken);

/**
 * @route   PUT /api/collectors/:id
 * @desc    Update collector
 * @access  Private (Creator/Admin only)
 */
router.put('/:id', authenticate, collectorController.updateCollector);

/**
 * @route   DELETE /api/collectors/:id
 * @desc    Delete collector
 * @access  Private (Creator/Admin only)
 */
router.delete('/:id', authenticate, collectorController.deleteCollector);

module.exports = router;
