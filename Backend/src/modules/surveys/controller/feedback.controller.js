// src/modules/surveys/controller/feedback.controller.js
const feedbackService = require('../service/feedback.service');

class FeedbackController {

    /**
     * Submit Feedback
     */
    async submitFeedback(req, res) {
        try {
            const { surveyId } = req.params;
            const { responseId, rating, comment, source } = req.body;

            // Handle internal feedback (source = internal) - requires authentication
            let userId = null;
            if (source === 'internal') {
                if (!req.user) {
                    return res.status(401).json({ success: false, message: 'Unauthorized for internal feedback' });
                }
                userId = req.user.id;
            }

            const feedback = await feedbackService.submitFeedback({
                surveyId,
                responseId,
                rating,
                comment,
                source: source || 'respondent',
                userId
            });

            res.status(201).json({ success: true, data: feedback });
        } catch (error) {
            console.error('Submit Feedback Error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * Get Feedback Stats (Admin/Creator)
     */
    async getFeedbackStats(req, res) {
        try {
            const { surveyId } = req.params;

            // Verify management access before showing stats
            const { Survey, WorkspaceMember } = require('../../../models');
            const survey = await Survey.findByPk(surveyId);
            if (!survey) {
                return res.status(404).json({ success: false, message: 'Survey not found' });
            }

            if (req.user.role !== 'admin' && survey.created_by !== req.user.id) {
                if (survey.workspace_id) {
                    const membership = await WorkspaceMember.findOne({
                        where: { workspace_id: survey.workspace_id, user_id: req.user.id }
                    });
                    if (!membership || !['owner', 'collaborator'].includes(membership.role)) {
                        return res.status(403).json({ success: false, message: 'Access denied. You do not have permission to view stats for this survey.' });
                    }
                } else {
                    return res.status(403).json({ success: false, message: 'Access denied.' });
                }
            }

            const stats = await feedbackService.getFeedbackStats(surveyId);
            res.json({ success: true, data: stats });
        } catch (error) {
            console.error('Get Feedback Stats Error:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * Trigger Reminders (Admin Only)
     */
    async triggerReminders(req, res) {
        try {
            if (!req.user || req.user.role !== 'admin') {
                return res.status(403).json({ success: false, message: 'Admin access required' });
            }

            const result = await feedbackService.triggerReminders();
            res.json({ success: true, data: result });
        } catch (error) {
            console.error('Trigger Reminders Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new FeedbackController();
