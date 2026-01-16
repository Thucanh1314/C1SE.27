// src/modules/users/controller/user.controller.js
const userService = require('../service/user.service');
const logger = require('../../../utils/logger');

class UserController {
  /**
   * Create new user
   */
  async createUser(req, res) {
    try {
      const { email, password, full_name } = req.body;

      if (!email || !password || !full_name) {
        return res.status(400).json({
          error: true,
          message: 'Missing required fields: email, password, full_name'
        });
      }

      const newUser = await userService.createUser(req.body);

      return res.status(201).json({
        error: false,
        message: 'User created successfully',
        data: { user: newUser }
      });
    } catch (error) {
      logger.error('Error creating user:', error);

      if (error.message.includes('already in use')) {
        return res.status(409).json({
          error: true,
          message: error.message
        });
      }

      return res.status(500).json({
        error: true,
        message: 'An error occurred while creating user'
      });
    }
  }

  /**
   * Get all users (paginated)
   */
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || '';
      const role = req.query.role || '';

      const result = await userService.getAllUsers(page, limit, search, role);

      return res.status(200).json({
        error: false,
        data: result
      });
    } catch (error) {
      logger.error('Error fetching users:', error);
      return res.status(500).json({
        error: true,
        message: 'An error occurred while fetching users'
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      // Check if the requesting user has permission to view this user
      if (!userService.canViewUser(req.user, id)) {
        return res.status(403).json({
          error: true,
          message: 'You do not have permission to view this user'
        });
      }

      const user = await userService.getUserById(id);

      return res.status(200).json({
        error: false,
        data: { user }
      });
    } catch (error) {
      logger.error(`Error fetching user with ID ${req.params.id}:`, error);

      if (error.message === 'User not found') {
        return res.status(404).json({
          error: true,
          message: error.message
        });
      }

      return res.status(500).json({
        error: true,
        message: 'An error occurred while fetching user'
      });
    }
  }

  /**
   * Update user
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { email, full_name, faculty, class_name, student_id, role } = req.body;

      // Check if the requesting user has permission to update this user
      if (!userService.canUpdateUser(req.user, id)) {
        return res.status(403).json({
          error: true,
          message: 'You do not have permission to update this user'
        });
      }

      // If not admin, prevent role changes
      if (!userService.canChangeRole(req.user) && role) {
        return res.status(403).json({
          error: true,
          message: 'You do not have permission to change user roles'
        });
      }

      // Prepare update data
      const updateData = {
        email,
        full_name,
        faculty,
        class_name,
        student_id
      };

      // Only allow role change if user is admin
      if (role && userService.canChangeRole(req.user)) {
        updateData.role = role;
      }

      const updatedUser = await userService.updateUser(id, updateData);

      return res.status(200).json({
        error: false,
        message: 'User updated successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      logger.error(`Error updating user with ID ${req.params.id}:`, error);

      if (error.message === 'User not found') {
        return res.status(404).json({
          error: true,
          message: error.message
        });
      }

      return res.status(500).json({
        error: true,
        message: 'An error occurred while updating user'
      });
    }
  }

  /**
   * Delete user
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      await userService.deleteUser(id);

      return res.status(200).json({
        error: false,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting user with ID ${req.params.id}:`, error);

      if (error.message === 'User not found') {
        return res.status(404).json({
          error: true,
          message: error.message
        });
      }

      return res.status(500).json({
        error: true,
        message: 'An error occurred while deleting user'
      });
    }
  }
}

module.exports = new UserController();
