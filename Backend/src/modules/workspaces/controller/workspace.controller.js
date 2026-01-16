// src/modules/workspaces/controller/workspace.controller.js
const workspaceService = require('../service/workspace.service');
const logger = require('../../../utils/logger');

class WorkspaceController {
  /**
   * GET /api/modules/workspaces/my
   * Get all workspaces where user is owner or member (admin sees all) with optional pagination
   */
  async getMyWorkspaces(req, res) {
    try {
      const { page, limit, search, scope } = req.query;
      const pagination = page && limit;

      if (pagination) {
        const result = await workspaceService.getMyWorkspacesPaginated(
          req.user.id,
          req.user,
          {
            page: parseInt(page),
            limit: parseInt(limit),
            search,
            scope // Pass scope
          }
        );

        res.status(200).json({
          ok: true,
          workspaces: result.workspaces,
          pagination: result.pagination
        });
      } else {
        const workspaces = await workspaceService.getMyWorkspaces(req.user.id, req.user);

        res.status(200).json({
          ok: true,
          workspaces
        });
      }
    } catch (error) {
      logger.error('Get my workspaces error:', error);
      res.status(500).json({
        ok: false,
        message: error.message || 'Error fetching workspaces'
      });
    }
  }

  /**
   * POST /api/modules/workspaces
   * Create a new workspace
   */
  async createWorkspace(req, res) {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          ok: false,
          message: 'Workspace name is required'
        });
      }

      const io = req.app.get('io'); // Get Socket.IO instance
      const workspace = await workspaceService.createWorkspace(
        { name, description },
        req.user.id,
        io // Pass io for real-time notifications
      );

      res.status(201).json({
        ok: true,
        workspace
      });
    } catch (error) {
      console.error('######## CONTROLLER ERROR:', error);
      logger.error('Create workspace error:', error);
      res.status(400).json({
        ok: false,
        message: error.message || 'Error creating workspace'
      });
    }
  }

  /**
   * GET /api/modules/workspaces/:id
   * Get workspace by ID (must be owner or member)
   */
  async getWorkspace(req, res) {
    try {
      const { id } = req.params;

      const workspace = await workspaceService.getWorkspaceById(id, req.user.id);

      res.status(200).json({
        ok: true,
        workspace
      });
    } catch (error) {
      logger.error('Get workspace error:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          message: error.message
        });
      }

      if (error.message.includes('Access denied')) {
        return res.status(403).json({
          ok: false,
          message: error.message
        });
      }

      res.status(500).json({
        ok: false,
        message: error.message || 'Error fetching workspace'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/:id/members
   * Add member to workspace (owner only)
   */
  async addMember(req, res) {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;

      if (!userId) {
        return res.status(400).json({
          ok: false,
          message: 'userId is required'
        });
      }

      if (!role) {
        return res.status(400).json({
          ok: false,
          message: 'role is required (collaborator or viewer)'
        });
      }

      const io = req.app.get('io'); // Get Socket.IO instance
      await workspaceService.addMember(
        id,           // workspaceId
        req.user.id,  // userId (not used in current addMember)
        userId,       // newMemberId
        role,         // role
        req.user.id,  // currentUserId
        io            // Socket.IO instance
      );

      res.status(200).json({
        ok: true,
        message: 'Member added successfully'
      });
    } catch (error) {
      logger.error('Add member error:', error);

      if (error.message.includes('owner can add')) {
        return res.status(403).json({
          ok: false,
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          message: error.message
        });
      }

      res.status(400).json({
        ok: false,
        message: error.message || 'Error adding member'
      });
    }
  }

  /**
   * DELETE /api/modules/workspaces/:id/members/:userId
   * Remove member from workspace (owner only)
   */
  async removeMember(req, res) {
    try {
      const { id, userId } = req.params;

      logger.debug(`[removeMember] Called: workspaceId=${id}, memberId=${userId}, currentUserId=${req.user.id}`);

      const io = req.app.get('io');
      const result = await workspaceService.removeMember(id, parseInt(userId), req.user.id, io);

      res.status(200).json({
        ok: true,
        message: result.message || 'Member removed successfully'
      });
    } catch (error) {
      logger.error('Remove member error:', error);

      if (error.message.includes('owner can remove')) {
        return res.status(403).json({
          ok: false,
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          message: error.message
        });
      }

      res.status(400).json({
        ok: false,
        message: error.message || 'Error removing member'
      });
    }
  }

  /**
   * PATCH /api/modules/workspaces/:id/members/:userId
   * Update member role (owner only)
   */
  async updateMemberRole(req, res) {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({
          ok: false,
          message: 'Role is required'
        });
      }

      const result = await workspaceService.updateMemberRole(
        id,
        parseInt(userId),
        role,
        req.user.id,
        req.app.get('io')
      );

      res.status(200).json({
        ok: true,
        member: result,
        message: result.message || 'Member role updated successfully'
      });
    } catch (error) {
      logger.error('Update member role error:', error);

      if (error.message.includes('owner can change')) {
        return res.status(403).json({
          ok: false,
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          message: error.message
        });
      }

      res.status(400).json({
        ok: false,
        message: error.message || 'Error updating member role'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/:id/leave
   * Leave workspace (members only, not owner)
   */
  async leaveWorkspace(req, res) {
    try {
      const { id } = req.params;

      const io = req.app.get('io');
      const result = await workspaceService.leaveWorkspace(id, req.user.id, io);

      res.status(200).json({
        ok: true,
        message: result.message || 'Successfully left workspace'
      });
    } catch (error) {
      logger.error('Leave workspace error:', error);

      if (error.message.includes('owner cannot leave')) {
        return res.status(403).json({
          ok: false,
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          message: error.message
        });
      }

      res.status(400).json({
        ok: false,
        message: error.message || 'Error leaving workspace'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/:id/transfer-ownership
   * Transfer ownership to another member (owner only)
   */
  async transferOwnership(req, res) {
    try {
      const { id } = req.params;
      const { newOwnerId } = req.body;

      if (!newOwnerId) {
        return res.status(400).json({
          ok: false,
          message: 'newOwnerId is required'
        });
      }

      const result = await workspaceService.transferOwnership(
        id,
        parseInt(newOwnerId),
        req.user.id
      );

      res.status(200).json({
        ok: true,
        result,
        message: result.message || 'Ownership transferred successfully'
      });
    } catch (error) {
      logger.error('Transfer ownership error:', error);

      if (error.message.includes('owner can transfer')) {
        return res.status(403).json({
          ok: false,
          message: error.message
        });
      }

      if (error.message.includes('not found')) {
        return res.status(404).json({
          ok: false,
          message: error.message
        });
      }

      res.status(400).json({
        ok: false,
        message: error.message || 'Error transferring ownership'
      });
    }
  }


  /**
   * GET /api/modules/workspaces/:id/surveys
   * List surveys in a workspace (members only)
   */
  async getWorkspaceSurveys(req, res) {
    try {
      const { id } = req.params;

      const result = await workspaceService.listSurveysByWorkspace(id, req.user.id, req.user);

      res.status(200).json({
        ok: true,
        workspaceId: result.workspaceId,
        surveys: result.surveys
      });
    } catch (error) {
      logger.error('Get workspace surveys error:', error);

      if (error.code === 'WORKSPACE_NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          code: 'WORKSPACE_NOT_FOUND',
          message: error.message
        });
      }

      if (error.code === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          code: 'FORBIDDEN',
          message: error.message
        });
      }

      res.status(500).json({
        ok: false,
        message: error.message || 'Error fetching workspace surveys'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/:id/invite
   * Invite user to workspace (owner/manager only)
   */
  async inviteMember(req, res) {
    try {
      const { id } = req.params;
      const { userId, role = 'member' } = req.body;

      if (!userId) {
        return res.status(400).json({
          ok: false,
          message: 'userId is required'
        });
      }

      const member = await workspaceService.inviteMember(id, userId, role, req.user.id, req.user);

      res.status(201).json({
        ok: true,
        member
      });
    } catch (error) {
      logger.error('Invite member error:', error);

      if (error.code === 'WORKSPACE_NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          code: 'WORKSPACE_NOT_FOUND',
          message: error.message
        });
      }

      if (error.code === 'FORBIDDEN') {
        return res.status(403).json({
          ok: false,
          code: 'FORBIDDEN',
          message: error.message
        });
      }

      if (error.code === 'USER_NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          code: 'USER_NOT_FOUND',
          message: error.message
        });
      }

      if (error.code === 'ALREADY_MEMBER') {
        return res.status(400).json({
          ok: false,
          code: 'ALREADY_MEMBER',
          message: error.message
        });
      }

      res.status(400).json({
        ok: false,
        message: error.message || 'Error inviting member'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/:id/join
   * Join a public workspace
   */
  async joinWorkspace(req, res) {
    try {
      const { id } = req.params;

      const member = await workspaceService.joinWorkspace(id, req.user.id);

      res.status(201).json({
        ok: true,
        member
      });
    } catch (error) {
      logger.error('Join workspace error:', error);

      if (error.code === 'WORKSPACE_NOT_FOUND') {
        return res.status(404).json({
          ok: false,
          code: 'WORKSPACE_NOT_FOUND',
          message: error.message
        });
      }

      if (error.code === 'INVITE_REQUIRED') {
        return res.status(403).json({
          ok: false,
          code: 'INVITE_REQUIRED',
          message: error.message
        });
      }

      res.status(400).json({
        ok: false,
        message: error.message || 'Error joining workspace'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/:id/invite
   * Invite user to workspace
   */
  async inviteToWorkspace(req, res) {
    try {
      const { id } = req.params;
      const { email, role = 'member' } = req.body;

      if (!email) {
        return res.status(400).json({
          ok: false,
          message: 'Email is required'
        });
      }

      const io = req.app.get('io'); // Get Socket.IO instance
      const invitation = await workspaceService.inviteToWorkspace(
        id,
        req.user.id,
        email,
        role,
        io // Pass io for real-time notifications
      );

      res.status(201).json({
        ok: true,
        invitation: {
          id: invitation.id,
          email: invitation.invitee_email,
          role: invitation.role,
          expires_at: invitation.expires_at
        }
      });
    } catch (error) {
      logger.error('Invite to workspace error:', error);
      res.status(400).json({
        ok: false,
        message: error.message || 'Error inviting user to workspace'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/accept-invitation
   * Accept workspace invitation
   */
  async acceptInvitation(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          ok: false,
          message: 'Invitation token is required'
        });
      }

      const io = req.app.get('io'); // Get Socket.IO instance
      const workspace = await workspaceService.acceptInvitation(token, req.user.id, io);

      res.status(200).json({
        ok: true,
        success: true,
        message: 'Invitation accepted successfully',
        redirectUrl: `/workspaces/${workspace.id}`, // SPA redirect target
        workspace: {
          id: workspace.id,
          name: workspace.name,
          description: workspace.description
        }
      });
    } catch (error) {
      logger.error('Accept invitation error:', error);
      res.status(400).json({
        ok: false,
        message: error.message || 'Error accepting invitation'
      });
    }
  }

  /**
   * GET /api/modules/workspaces/:id/members
   * Get workspace members
   */
  async getWorkspaceMembers(req, res) {
    try {
      const { id } = req.params;

      const members = await workspaceService.getWorkspaceMembers(id, req.user.id);

      res.status(200).json({
        ok: true,
        members
      });
    } catch (error) {
      logger.error('Get workspace members error:', error);
      res.status(400).json({
        ok: false,
        message: error.message || 'Error fetching workspace members'
      });
    }
  }

  /**
   * GET /api/modules/workspaces/:id/activities
   * Get workspace activities
   */
  async getWorkspaceActivities(req, res) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      const activities = await workspaceService.getWorkspaceActivities(id, req.user.id, limit);

      res.status(200).json({
        ok: true,
        activities
      });
    } catch (error) {
      logger.error('Get workspace activities error:', error);
      res.status(400).json({
        ok: false,
        message: error.message || 'Error fetching workspace activities'
      });
    }
  }

  /**
   * PUT /api/modules/workspaces/:id
   * Update workspace (owner only)
   */
  async updateWorkspace(req, res) {
    try {
      const { id } = req.params;
      const { name, description, visibility } = req.body;

      if (!name) {
        return res.status(400).json({
          ok: false,
          message: 'Workspace name is required'
        });
      }

      const workspace = await workspaceService.updateWorkspace(
        id,
        { name, description, visibility },
        req.user.id
      );

      res.status(200).json({
        ok: true,
        workspace
      });
    } catch (error) {
      logger.error('Update workspace error:', error);
      const statusCode = error.message.includes('not found') || error.message.includes('Access denied') ? 404 : 400;
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Error updating workspace'
      });
    }
  }

  /**
   * DELETE /api/modules/workspaces/:id
   * Delete workspace (owner only)
   */
  async deleteWorkspace(req, res) {
    try {
      const { id } = req.params;

      await workspaceService.deleteWorkspace(id, req.user.id);

      res.status(200).json({
        ok: true,
        message: 'Workspace deleted successfully'
      });
    } catch (error) {
      logger.error('Delete workspace error:', error);
      const statusCode = error.message.includes('not found') || error.message.includes('Access denied') ? 404 : 400;
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Error deleting workspace'
      });
    }
  }

  /**
   * GET /api/modules/workspaces/:workspaceId/invitations/pending
   * Get pending invitations sent for a workspace
   */
  async getPendingInvitations(req, res) {
    try {
      const { workspaceId } = req.params;

      const invitations = await workspaceService.getPendingInvitations(
        workspaceId,
        req.user.id
      );

      res.status(200).json({
        ok: true,
        invitations
      });
    } catch (error) {
      logger.error('Get pending invitations error:', error);
      const statusCode = error.message.includes('Access denied') ? 403 : 400;
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Error fetching invitations'
      });
    }
  }

  /**
   * GET /api/modules/workspaces/invitations/received
   * Get invitations received by current user
   */
  async getReceivedInvitations(req, res) {
    try {
      const invitations = await workspaceService.getReceivedInvitations(req.user.email);

      res.status(200).json({
        ok: true,
        invitations
      });
    } catch (error) {
      logger.error('Get received invitations error:', error);
      res.status(500).json({
        ok: false,
        message: error.message || 'Error fetching invitations'
      });
    }
  }

  /**
   * DELETE /api/modules/workspaces/invitations/:invitationId
   * Cancel/revoke an invitation
   */
  async cancelInvitation(req, res) {
    try {
      const { invitationId } = req.params;

      await workspaceService.cancelInvitation(invitationId, req.user.id);

      res.status(200).json({
        ok: true,
        message: 'Invitation cancelled successfully'
      });
    } catch (error) {
      logger.error('Cancel invitation error:', error);
      const statusCode = error.message.includes('Access denied') || error.message.includes('not found') ? 403 : 400;
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Error cancelling invitation'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/invitations/:invitationId/decline
   * Decline an invitation
   */
  async declineInvitation(req, res) {
    try {
      const { invitationId } = req.params;

      await workspaceService.declineInvitation(invitationId, req.user.id);

      res.status(200).json({
        ok: true,
        message: 'Invitation declined successfully'
      });
    } catch (error) {
      logger.error('Decline invitation error:', error);
      const statusCode = error.message.includes('Access denied') || error.message.includes('not found') ? 403 : 400;
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Error declining invitation'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/invitations/:invitationId/resend
   * Resend an invitation
   */
  async resendInvitation(req, res) {
    try {
      const { invitationId } = req.params;

      const result = await workspaceService.resendInvitation(invitationId, req.user.id);

      res.status(200).json({
        ok: true,
        message: 'Invitation resent successfully',
        invitation: result
      });
    } catch (error) {
      logger.error('Resend invitation error:', error);
      const statusCode = error.message.includes('Access denied') || error.message.includes('not found') ? 403 : 400;
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Error resending invitation'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/invitations/:invitationId/decline
   * Decline an invitation
   */
  async declineInvitation(req, res) {
    try {
      const { invitationId } = req.params;

      await workspaceService.declineInvitation(invitationId, req.user.id);

      res.status(200).json({
        ok: true,
        message: 'Invitation declined successfully'
      });
    } catch (error) {
      logger.error('Decline invitation error:', error);
      const statusCode = error.message.includes('Access denied') || error.message.includes('not found') ? 403 : 400;
      res.status(statusCode).json({
        ok: false,
        message: error.message || 'Error declining invitation'
      });
    }
  }

  /**
   * DELETE /api/modules/workspaces/bulk
   * Delete multiple workspaces
   */
  async deleteMultipleWorkspaces(req, res) {
    try {
      const { workspaceIds } = req.body;

      if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) {
        return res.status(400).json({
          ok: false,
          message: 'workspaceIds array is required'
        });
      }

      let deletedCount = 0;
      const errors = [];

      for (const workspaceId of workspaceIds) {
        try {
          await workspaceService.deleteWorkspace(workspaceId, req.user.id, req.user);
          deletedCount++;
        } catch (error) {
          logger.error(`Error deleting workspace ${workspaceId}:`, error);
          errors.push({
            workspaceId,
            error: error.message
          });
        }
      }

      res.status(200).json({
        ok: true,
        success: true,
        deletedCount,
        totalRequested: workspaceIds.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully deleted ${deletedCount} of ${workspaceIds.length} workspaces`
      });
    } catch (error) {
      logger.error('Delete multiple workspaces error:', error);
      res.status(500).json({
        ok: false,
        message: error.message || 'Error deleting workspaces'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/:id/request-promotion
   * Request a role upgrade in a workspace
   */
  async requestPromotion(req, res) {
    try {
      const { id } = req.params;
      const { requestedRole } = req.body;

      if (!requestedRole) {
        return res.status(400).json({
          ok: false,
          message: 'Requested role is required'
        });
      }

      const io = req.app.get('io');
      const result = await workspaceService.requestRoleChange(id, req.user.id, requestedRole, io);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Request promotion error:', error);
      res.status(400).json({
        ok: false,
        message: error.message || 'Error requesting promotion'
      });
    }
  }

  /**
   * POST /api/modules/workspaces/notifications/:notificationId/handle-role-request
   * Approve or decline a role change request
   */
  async handleRoleRequest(req, res) {
    try {
      const { notificationId } = req.params;
      const { action } = req.body;

      if (!['approve', 'decline'].includes(action)) {
        return res.status(400).json({
          ok: false,
          message: 'Action must be either "approve" or "decline"'
        });
      }

      const io = req.app.get('io');
      const result = await workspaceService.handleRoleChangeRequest(notificationId, action, req.user.id, io);

      res.status(200).json(result);
    } catch (error) {
      logger.error('Handle role request error:', error);
      res.status(400).json({
        ok: false,
        message: error.message || 'Error handling role request'
      });
    }
  }
}

module.exports = new WorkspaceController();





