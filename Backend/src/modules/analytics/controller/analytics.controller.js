const analyticsService = require('../service/analytics.service');
const surveyAccessService = require('../../surveys/service/surveyAccess.service');

class AnalyticsController {
    _checkAccess = async (surveyId, user, res) => {
        const hasAccess = await surveyAccessService.hasAccess(surveyId, user.id, 'view');
        if (!hasAccess) {
            res.status(403).json({ success: false, message: 'Access denied' });
            return false;
        }
        return true;
    }

    getOverview = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const data = await analyticsService.getOverview(surveyId);
            res.json({ success: true, data });
        } catch (error) {
            console.error('[AnalyticsController] getOverview ERROR:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    getQuestionAnalysis = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const data = await analyticsService.getQuestionAnalysis(surveyId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    getSegmentAnalysis = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const { groupBy, filterQuestionId, filterOptionId } = req.query;
            const data = await analyticsService.getSegmentAnalysis(surveyId, groupBy, filterQuestionId, filterOptionId);
            res.json({ success: true, data });
        } catch (error) {
            console.error('[AnalyticsController] getSegmentAnalysis ERROR:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }


    getDropOffAnalysis = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const data = await analyticsService.getDropOffAnalysis(surveyId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    getAiInsights = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const data = await analyticsService.getAiInsights(surveyId, req.user.id, req.app.get('io'));
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    getAdminDashboard = async (req, res) => {
        try {
            const data = await analyticsService.getAdminDashboard();
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    getQualityScore = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const data = await require('../service/quality.service').calculateQualityScore(surveyId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    chatWithData = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const { message, messages, provider } = req.body;
            const conversation = messages || (message ? [{ role: 'user', content: message }] : []);
            if (!conversation.length && !message) {
                return res.status(400).json({ success: false, message: 'Message or history is required' });
            }
            const answer = await analyticsService.chatWithData(surveyId, conversation, provider);
            res.json({ success: true, data: { answer } });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    getFeedbackSummary = async (req, res) => {
        try {
            const { surveyId } = req.params;
            if (!await this._checkAccess(surveyId, req.user, res)) return;
            const result = await analyticsService.getFeedbackSummary(surveyId);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    getCreatorDashboard = async (req, res) => {
        try {
            const userId = req.user.id;
            const data = await analyticsService.getCreatorDashboard(userId);
            res.json({ success: true, data });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new AnalyticsController();
