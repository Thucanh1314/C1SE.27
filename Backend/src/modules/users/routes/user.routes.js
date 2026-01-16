// src/modules/users/routes/user.routes.js
const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { authenticate, isTeacherOrAdmin, isAdmin } = require('../../../middleware/auth.middleware');

// Protected routes
// Protected routes
router.post('/', authenticate, isAdmin, userController.createUser);
router.get('/', authenticate, isTeacherOrAdmin, userController.getAllUsers);
router.get('/:id', authenticate, userController.getUserById);
router.put('/:id', authenticate, userController.updateUser);
router.patch('/:id', authenticate, userController.updateUser);
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);

// Mount Upgrade Request Routes
router.use('/', require('./upgradeRequest.routes'));

module.exports = router;
