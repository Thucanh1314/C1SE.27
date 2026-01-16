// src/modules/questions/controller/question.controller.js
const questionService = require('../service/question.service');

class QuestionController {

    // Get all question types
    getQuestionTypes = async (req, res, next) => {
        try {
            const types = await questionService.getQuestionTypes();
            res.json({ success: true, types });
        } catch (error) {
            next(error);
        }
    };

    // Update question
    updateQuestion = async (req, res, next) => {
        try {
            const { id } = req.params;
            const question = await questionService.updateQuestion(id, req.body, req.user);
            res.json({ success: true, question });
        } catch (error) {
            if (error.message === 'Question not found' || error.message === 'Associated template not found') {
                return res.status(404).json({ success: false, message: error.message });
            }
            if (error.message === 'Access denied') {
                return res.status(403).json({ success: false, message: error.message });
            }
            next(error);
        }
    };

    // Delete question
    deleteQuestion = async (req, res, next) => {
        try {
            const { id } = req.params;
            await questionService.deleteQuestion(id, req.user);
            res.json({ success: true, message: 'Question deleted successfully' });
        } catch (error) {
            if (error.message === 'Question not found') {
                return res.status(404).json({ success: false, message: error.message });
            }
            if (error.message === 'Access denied') {
                return res.status(403).json({ success: false, message: error.message });
            }
            next(error);
        }
    };

    // Options Handlers
    addOption = async (req, res, next) => {
        try {
            const option = await questionService.addOption(req.body, req.user);
            res.json({ success: true, option });
        } catch (error) {
            next(error);
        }
    };

    updateOption = async (req, res, next) => {
        try {
            const { id } = req.params;
            const option = await questionService.updateOption(id, req.body, req.user);
            res.json({ success: true, option });
        } catch (error) {
            next(error);
        }
    };

    deleteOption = async (req, res, next) => {
        try {
            const { id } = req.params;
            await questionService.deleteOption(id, req.user);
            res.json({ success: true, message: 'Option deleted successfully' });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = new QuestionController();
