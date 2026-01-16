// src/modules/users/service/user.service.js
const { User } = require('../../../models');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');

class UserService {
  /**
   * Create new user
   */
  async createUser(userData) {
    const { username, email, password, role, full_name } = userData;

    // Check existing email
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      throw new Error('Email is already in use');
    }

    // Check existing username
    // Only check if username is provided (some systems use email as username)
    if (username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        throw new Error('Username is already in use');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      username: username || email.split('@')[0], // Fallback username
      email,
      password: hashedPassword,
      full_name: full_name || username || email.split('@')[0],
      role: role || 'user',
      student_id: userData.student_id,
      faculty: userData.faculty,
      class_name: userData.class_name
    });

    // Return without password
    const userJson = newUser.toJSON();
    delete userJson.password;
    return userJson;
  }

  /**
   * Get all users with pagination
   */
  async getAllUsers(page = 1, limit = 10, search = '') {
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { full_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['id', 'DESC']] // Newest first
    });

    return {
      users,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Update user fields
    const fieldsToUpdate = {};

    // Check duplicate email if changing
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({
        where: { email: updateData.email, id: { [Op.ne]: user.id } }
      });
      if (existingUser) {
        throw new Error('Email is already in use by another account');
      }
      fieldsToUpdate.email = updateData.email;
    }

    if (updateData.full_name) fieldsToUpdate.full_name = updateData.full_name;
    if (updateData.faculty) fieldsToUpdate.faculty = updateData.faculty;
    if (updateData.class_name) fieldsToUpdate.class_name = updateData.class_name;
    if (updateData.student_id) fieldsToUpdate.student_id = updateData.student_id;
    if (updateData.role) fieldsToUpdate.role = updateData.role;

    await user.update(fieldsToUpdate);

    // Return user without password
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      student_id: user.student_id,
      faculty: user.faculty,
      class_name: user.class_name
    };
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('User not found');
    }

    await user.destroy();
    return true;
  }

  /**
   * Check if user has permission to view another user
   */
  canViewUser(requestingUser, targetUserId) {
    // Admin and creators can view anyone
    if (requestingUser.role === 'admin' || requestingUser.role === 'creator') {
      return true;
    }

    // Users can only view themselves
    return requestingUser.id === parseInt(targetUserId);
  }

  /**
   * Check if user has permission to update another user
   */
  canUpdateUser(requestingUser, targetUserId) {
    // Admin can update anyone
    if (requestingUser.role === 'admin') {
      return true;
    }

    // Users can only update themselves
    return requestingUser.id === parseInt(targetUserId);
  }

  /**
   * Check if user can change roles
   */
  canChangeRole(requestingUser) {
    return requestingUser.role === 'admin';
  }
}

module.exports = new UserService();
