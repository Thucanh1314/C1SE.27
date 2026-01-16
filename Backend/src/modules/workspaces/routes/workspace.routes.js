// src/modules/workspaces/routes/workspace.routes.js
const express = require('express');
const router = express.Router();
const workspaceController = require('../controller/workspace.controller');
const { authenticate, isCreatorOrAdmin } = require('../../../middleware/auth.middleware');

/**
 * @route   GET /api/modules/workspaces/my
 * @desc    Get all workspaces where user is owner or member
 * @access  Private (any authenticated user)
 */
router.get('/my', authenticate, workspaceController.getMyWorkspaces);

/**
 * @route   POST /api/modules/workspaces/accept-invitation
 * @desc    Accept workspace invitation
 * @access  Private
 */
router.post('/accept-invitation', authenticate, workspaceController.acceptInvitation);

/**
 * @route   GET /api/modules/workspaces/invitations/received
 * @desc    Get invitations received by current user
 * @access  Private
 */
router.get('/invitations/received', authenticate, workspaceController.getReceivedInvitations);

/**
 * @route   DELETE /api/modules/workspaces/invitations/:invitationId
 * @desc    Cancel/revoke an invitation
 * @access  Private (owner only)
 */
router.delete('/invitations/:invitationId', authenticate, workspaceController.cancelInvitation);

/**
 * @route   POST /api/modules/workspaces/invitations/:invitationId/resend
 * @desc    Resend an invitation
 * @access  Private (owner only)
 */
router.post('/invitations/:invitationId/resend', authenticate, workspaceController.resendInvitation);

/**
 * @route   POST /api/modules/workspaces/invitations/:invitationId/decline
 * @desc    Decline an invitation
 * @access  Private
 */
router.post('/invitations/:invitationId/decline', authenticate, workspaceController.declineInvitation);

/**
 * @route   POST /api/modules/workspaces
 * @desc    Create a new workspace
 * @access  Private (creator/admin)
 */
router.post('/', authenticate, isCreatorOrAdmin, workspaceController.createWorkspace);

/**
 * @route   DELETE /api/modules/workspaces/bulk
 * @desc    Delete multiple workspaces
 * @access  Private (creator/admin)
 */
router.delete('/bulk', authenticate, isCreatorOrAdmin, workspaceController.deleteMultipleWorkspaces);

/**
 * @route   GET /api/modules/workspaces/:workspaceId/invitations/pending
 * @desc    Get pending invitations for a workspace
 * @access  Private (owner only)
 */
router.get('/:workspaceId/invitations/pending', authenticate, workspaceController.getPendingInvitations);

/**
 * @route   GET /api/modules/workspaces/:id
 * @desc    Get workspace by ID (must be owner or member)
 * @access  Private
 */
router.get('/:id', authenticate, workspaceController.getWorkspace);

/**
 * @route   POST /api/modules/workspaces/:id/members
 * @desc    Add member to workspace (owner only)
 * @access  Private
 */
router.post('/:id/members', authenticate, workspaceController.addMember);

/**
 * @route   DELETE /api/modules/workspaces/:id/members/:userId
 * @desc    Remove member from workspace (owner only)
 * @access  Private
 */
router.delete('/:id/members/:userId', authenticate, workspaceController.removeMember);

/**
 * @route   PATCH /api/modules/workspaces/:id/members/:userId
 * @desc    Update member role (owner only)
 * @access  Private
 */
router.patch('/:id/members/:userId', authenticate, workspaceController.updateMemberRole);

/**
 * @route   POST /api/modules/workspaces/:id/leave
 * @desc    Leave workspace (members only, not owner)
 * @access  Private
 */
router.post('/:id/leave', authenticate, workspaceController.leaveWorkspace);

/**
 * @route   POST /api/modules/workspaces/:id/transfer-ownership
 * @desc    Transfer ownership to another member (owner only)
 * @access  Private
 */
router.post('/:id/transfer-ownership', authenticate, workspaceController.transferOwnership);


/**
 * @route   GET /api/modules/workspaces/:id/surveys
 * @desc    List surveys in a workspace (members only)
 * @access  Private
 */
router.get('/:id/surveys', authenticate, workspaceController.getWorkspaceSurveys);

/**
 * @route   POST /api/modules/workspaces/:id/invite
 * @desc    Invite user to workspace by email
 * @access  Private (owner/collaborator)
 */
router.post('/:id/invite', authenticate, workspaceController.inviteToWorkspace);

/**
 * @route   GET /api/modules/workspaces/:id/members
 * @desc    Get workspace members
 * @access  Private (members only)
 */
router.get('/:id/members', authenticate, workspaceController.getWorkspaceMembers);

/**
 * @route   GET /api/modules/workspaces/:id/activities
 * @desc    Get workspace activities
 * @access  Private (members only)
 */
router.get('/:id/activities', authenticate, workspaceController.getWorkspaceActivities);

/**
 * @route   PUT /api/modules/workspaces/:id
 * @desc    Update workspace (owner only)
 * @access  Private
 */
router.put('/:id', authenticate, workspaceController.updateWorkspace);

/**
 * @route   DELETE /api/modules/workspaces/:id
 * @desc    Delete workspace (owner only)
 * @access  Private
 */
router.delete('/:id', authenticate, workspaceController.deleteWorkspace);

/**
 * @route   POST /api/modules/workspaces/:id/request-promotion
 * @desc    Request a role upgrade in a workspace
 * @access  Private
 */
router.post('/:id/request-promotion', authenticate, workspaceController.requestPromotion);

/**
 * @route   POST /api/modules/workspaces/notifications/:notificationId/handle-role-request
 * @desc    Approve or decline a role change request
 * @access  Private (owner focus)
 */
router.post('/notifications/:notificationId/handle-role-request', authenticate, workspaceController.handleRoleRequest);

module.exports = router;





