const express = require('express');
const router = express.Router();
const analyticsController = require('../controller/analytics.controller');
const { authenticate, isAdmin } = require('../../../middleware/auth.middleware');

// Define routes
router.get('/survey/:surveyId/overview', authenticate, analyticsController.getOverview);
router.get('/survey/:surveyId/questions', authenticate, analyticsController.getQuestionAnalysis);
router.get('/survey/:surveyId/segments', authenticate, analyticsController.getSegmentAnalysis);
router.get('/survey/:surveyId/drop-off', authenticate, analyticsController.getDropOffAnalysis);
router.post('/survey/:surveyId/ai-insights', authenticate, analyticsController.getAiInsights);
router.get('/survey/:surveyId/quality', authenticate, analyticsController.getQualityScore);
router.get('/survey/:surveyId/feedback-summary', authenticate, analyticsController.getFeedbackSummary);
router.post('/survey/:surveyId/chat', authenticate, analyticsController.chatWithData);
router.get('/creator/dashboard', authenticate, analyticsController.getCreatorDashboard);
router.get('/admin/dashboard', authenticate, isAdmin, analyticsController.getAdminDashboard);

module.exports = router;
