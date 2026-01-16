// src/modules/questions/routes/question.routes.js
const express = require('express');
const router = express.Router();
const questionController = require('../controller/question.controller');
const { authenticate, isTeacherOrAdmin } = require('../../../middleware/auth.middleware');

// Questions Update/Delete
router.put('/:id', authenticate, isTeacherOrAdmin, questionController.updateQuestion);
router.delete('/:id', authenticate, isTeacherOrAdmin, questionController.deleteQuestion);

// Options
router.post('/options', authenticate, isTeacherOrAdmin, questionController.addOption);
router.put('/options/:id', authenticate, isTeacherOrAdmin, questionController.updateOption);
router.delete('/options/:id', authenticate, isTeacherOrAdmin, questionController.deleteOption);

// Get Types
router.get('/types', authenticate, questionController.getQuestionTypes);

module.exports = router;
