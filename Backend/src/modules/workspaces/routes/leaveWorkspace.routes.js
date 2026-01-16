// src/modules/workspaces/routes/leaveWorkspace.routes.js
const express = require('express');
const { authenticate } = require('../../auth-rbac/middleware/auth.middleware');
const LeaveWorkspaceService = require('../service/leaveWorkspace.service');

const router = express.Router();

/**
 * GET /api/workspaces/:id/leave/preview
 * Preview what will happen if user leaves workspace
 */
router.get('/:id/leave/preview', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user.id;
    const user = req.user;

    const preview = await LeaveWorkspaceService.getLeavePreview(userId, workspaceId, user);

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    console.error('Leave preview error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/workspaces/:id/leave
 * Leave workspace with role-specific handling
 */
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const userId = req.user.id;
    const user = req.user;

    const result = await LeaveWorkspaceService.leaveWorkspace(userId, workspaceId, user);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Leave workspace error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/workspaces/:id/transfer-ownership
 * Transfer ownership to another member (Creator Owner scenario)
 */
router.post('/:id/transfer-ownership', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const currentOwnerId = req.user.id;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({
        success: false,
        message: 'newOwnerId is required'
      });
    }

    const result = await LeaveWorkspaceService.transferOwnership(
      currentOwnerId,
      workspaceId,
      newOwnerId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/workspaces/:id/potential-owners
 * Get list of members who can become owners (for transfer ownership)
 */
router.get('/:id/potential-owners', authenticate, async (req, res) => {
  try {
    const workspaceId = req.params.id;
    const { WorkspaceMember, User } = require('../../../models');

    // Get collaborators who can become owners
    const potentialOwners = await WorkspaceMember.findAll({
      where: {
        workspace_id: workspaceId,
        role: ['collaborator', 'owner'] // Include current owners too
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'full_name', 'role']
      }]
    });

    const formattedOwners = potentialOwners.map(member => ({
      userId: member.user.id,
      username: member.user.username,
      fullName: member.user.full_name,
      systemRole: member.user.role,
      workspaceRole: member.role,
      canBecomeOwner: member.role === 'collaborator' || member.role === 'owner'
    }));

    res.json({
      success: true,
      data: formattedOwners
    });
  } catch (error) {
    console.error('Get potential owners error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get potential owners'
    });
  }
});

module.exports = router;