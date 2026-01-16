// src/api/services/workspace.service.js - Workspace API service
import http from '../http';

const WorkspaceService = {
  /**
   * Get all workspaces for the current user
   * @returns {Promise<{ok: boolean, items: Array, total: number}>}
   */
  async getMyWorkspaces() {
    try {
      const response = await http.get('/workspaces/my');
      console.log('[WorkspaceService.getMyWorkspaces] Response:', response.data);

      // Handle multiple possible response formats from backend
      const responseData = response.data || {};
      const { ok, success, data } = responseData;

      // Extract workspaces from various possible locations in response
      const workspaces = data?.workspaces || data?.items || responseData.workspaces || responseData.items || [];
      const total = data?.total || responseData.total || workspaces.length;

      // Ensure workspaces is always an array
      const workspaceArray = Array.isArray(workspaces) ? workspaces : [];

      console.log(`[WorkspaceService.getMyWorkspaces] Extracted ${workspaceArray.length} workspaces, total: ${total}`);

      return {
        ok: ok !== false && success !== false,
        items: workspaceArray,
        total: total,
      };
    } catch (error) {
      console.error('[WorkspaceService.getMyWorkspaces] ERROR:', error);

      // If error response has data, use that message
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch workspaces';
      console.error('[WorkspaceService.getMyWorkspaces] Error message:', errorMessage);

      // Always return an object with ok: false, never throw
      return {
        ok: false,
        items: [],
        total: 0,
        error: errorMessage,
      };
    }
  },

  /**
   * Get a single workspace by ID
   * @param {string} id - Workspace ID
   * @returns {Promise<{ok: boolean, data?: Object, error?: string}>}
   */
  async getWorkspaceById(id) {
    try {
      if (!id) {
        throw new Error('Workspace ID is required');
      }

      const response = await http.get(`/workspaces/${id}`);
      console.log(`[WorkspaceService.getWorkspaceById] Retrieved workspace ${id}:`, response.data);

      const responseData = response.data || {};
      const { ok, success, workspace } = responseData;

      // Backend returns workspace directly in response.data.workspace
      const workspaceData = workspace || responseData.data?.workspace || responseData.data;

      return {
        ok: ok !== false && success !== false,
        data: workspaceData || null,
      };
    } catch (error) {
      console.error(`[WorkspaceService.getWorkspaceById] ERROR for ID ${id}:`, error.message || error);

      return {
        ok: false,
        data: null,
        error: error.message || 'Failed to fetch workspace',
      };
    }
  },

  /**
   * Create a new workspace
   * @param {Object} payload - Workspace creation payload { name, description? }
   * @returns {Promise<{ok: boolean, data?: Object, error?: string}>}
   */
  async createWorkspace(payload) {
    try {
      if (!payload || !payload.name) {
        throw new Error('Workspace name is required');
      }

      const response = await http.post('/workspaces', payload);
      console.log('[WorkspaceService.createWorkspace] Created workspace:', response.data);

      const responseData = response.data || {};
      const { ok, success, data } = responseData;
      const workspace = data?.workspace || data || responseData;

      return {
        ok: ok !== false && success !== false,
        data: workspace || null,
      };
    } catch (error) {
      console.error('[WorkspaceService.createWorkspace] ERROR:', error.message || error);

      return {
        ok: false,
        data: null,
        error: error.message || 'Failed to create workspace',
      };
    }
  },



  /**
   * Get workspace members
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<{ok: boolean, items: Array, total: number}>}
   */
  async getWorkspaceMembers(workspaceId) {
    try {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      const response = await http.get(`/workspaces/${workspaceId}/members`);
      console.log(`[WorkspaceService.getWorkspaceMembers] Retrieved members for workspace ${workspaceId}:`, response.data);

      const responseData = response.data || {};
      const { ok, success, data } = responseData;

      // Extract members from various possible locations in response
      const members = data?.members || data?.items || responseData.members || responseData.items || [];
      const total = data?.total || responseData.total || members.length;

      // Ensure members is always an array
      const memberArray = Array.isArray(members) ? members : [];

      console.log(`[WorkspaceService.getWorkspaceMembers] Extracted ${memberArray.length} members for workspace ${workspaceId}`);

      return {
        ok: ok !== false && success !== false,
        items: memberArray,
        total: total,
      };
    } catch (error) {
      console.error(`[WorkspaceService.getWorkspaceMembers] ERROR for workspace ${workspaceId}:`, error.message || error);

      return {
        ok: false,
        items: [],
        total: 0,
        error: error.message || 'Failed to fetch workspace members',
      };
    }
  },

  /**
   * Add a member to a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {Object} payload - Member payload { userId, role }
   * @returns {Promise<{ok: boolean, data?: Object, error?: string}>}
   */
  async addWorkspaceMember(workspaceId, payload) {
    try {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      if (!payload || !payload.userId || !payload.role) {
        throw new Error('User ID and role are required');
      }

      const response = await http.post(`/workspaces/${workspaceId}/members`, payload);
      console.log(`[WorkspaceService.addWorkspaceMember] Added member to workspace ${workspaceId}:`, response.data);

      const responseData = response.data || {};
      const { ok, success, data } = responseData;
      const member = data?.member || data || responseData;

      return {
        ok: ok !== false && success !== false,
        data: member || null,
      };
    } catch (error) {
      console.error(`[WorkspaceService.addWorkspaceMember] ERROR for workspace ${workspaceId}:`, error.message || error);

      return {
        ok: false,
        data: null,
        error: error.message || 'Failed to add workspace member',
      };
    }
  },

  /**
   * Remove a member from a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} memberId - Member ID
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async removeWorkspaceMember(workspaceId, memberId) {
    try {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      if (!memberId) {
        throw new Error('Member ID is required');
      }

      const response = await http.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      console.log(`[WorkspaceService.removeWorkspaceMember] Removed member ${memberId} from workspace ${workspaceId}:`, response.data);

      const responseData = response.data || {};
      const { ok, success } = responseData;

      return {
        ok: ok !== false && success !== false,
      };
    } catch (error) {
      console.error(`[WorkspaceService.removeWorkspaceMember] ERROR:`, error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to remove workspace member',
      };
    }
  },

  /**
   * Update member role in a workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} memberId - Member ID
   * @param {string} role - New role (owner, collaborator, member, viewer)
   * @returns {Promise<{ok: boolean, member?: Object, error?: string}>}
   */
  async updateMemberRole(workspaceId, memberId, role) {
    try {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      if (!memberId) {
        throw new Error('Member ID is required');
      }

      if (!role) {
        throw new Error('Role is required');
      }

      const response = await http.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
      console.log(`[WorkspaceService.updateMemberRole] Updated member ${memberId} role in workspace ${workspaceId}:`, response.data);

      const responseData = response.data || {};
      const { ok, success, member } = responseData;

      return {
        ok: ok !== false && success !== false,
        member: member || null,
      };
    } catch (error) {
      console.error(`[WorkspaceService.updateMemberRole] ERROR:`, error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to update member role',
      };
    }
  },


  /**
   * Leave a workspace
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async leaveWorkspace(workspaceId) {
    try {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      const response = await http.post(`/workspaces/${workspaceId}/leave`);
      console.log(`[WorkspaceService.leaveWorkspace] Left workspace ${workspaceId}:`, response.data);

      const responseData = response.data || {};
      const { ok, success } = responseData;

      return {
        ok: ok !== false && success !== false,
        message: responseData.message || 'Successfully left workspace',
      };
    } catch (error) {
      console.error(`[WorkspaceService.leaveWorkspace] ERROR:`, error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to leave workspace',
      };
    }
  },

  /**
   * Transfer workspace ownership to another member
   * @param {string} workspaceId - Workspace ID
   * @param {string} newOwnerId - New owner user ID
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async transferOwnership(workspaceId, newOwnerId) {
    try {
      if (!workspaceId) {
        throw new Error('Workspace ID is required');
      }

      if (!newOwnerId) {
        throw new Error('New owner ID is required');
      }

      const response = await http.post(`/workspaces/${workspaceId}/transfer-ownership`, { newOwnerId });
      console.log(`[WorkspaceService.transferOwnership] Transferred ownership of workspace ${workspaceId}:`, response.data);

      const responseData = response.data || {};
      const { ok, success } = responseData;

      return {
        ok: ok !== false && success !== false,
        message: responseData.message || 'Ownership transferred successfully',
      };
    } catch (error) {
      console.error(`[WorkspaceService.transferOwnership] ERROR:`, error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to transfer ownership',
      };
    }
  },

  /**
   * Invite user to workspace
   * @param {string} workspaceId - Workspace ID
   * @param {string} email - Invitee email
   * @param {string} role - Role (member, collaborator, viewer)
   * @returns {Promise<{ok: boolean, invitation?: Object, error?: string}>}
   */
  async inviteToWorkspace(workspaceId, email, role = 'member') {
    try {
      const response = await http.post(`/workspaces/${workspaceId}/invite`, {
        email,
        role
      });
      console.log('[WorkspaceService.inviteToWorkspace] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        invitation: response.data.invitation,
        message: 'Invitation sent successfully'
      };
    } catch (error) {
      console.error('[WorkspaceService.inviteToWorkspace] ERROR:', error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to send invitation'
      };
    }
  },

  /**
   * Accept workspace invitation
   * @param {string} token - Invitation token
   * @returns {Promise<{ok: boolean, workspace?: Object, error?: string}>}
   */
  async acceptInvitation(token) {
    try {
      const response = await http.post(`/workspaces/accept-invitation`, {
        token
      });
      console.log('[WorkspaceService.acceptInvitation] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        workspace: response.data.workspace,
        message: response.data.message || 'Invitation accepted successfully'
      };
    } catch (error) {
      console.error('[WorkspaceService.acceptInvitation] ERROR:', error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to accept invitation'
      };
    }
  },

  /**
   * Decline workspace invitation
   * @param {string|number} invitationId - Invitation ID
   * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
   */
  async declineInvitation(invitationId) {
    try {
      const response = await http.post(`/workspaces/invitations/${invitationId}/decline`);
      console.log('[WorkspaceService.declineInvitation] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        message: response.data.message || 'Invitation declined successfully'
      };
    } catch (error) {
      console.error('[WorkspaceService.declineInvitation] ERROR:', error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to decline invitation'
      };
    }
  },



  /**
   * Get workspace activities
   * @param {string} workspaceId - Workspace ID
   * @param {number} limit - Number of activities to fetch
   * @returns {Promise<{ok: boolean, activities?: Array, error?: string}>}
   */
  async getWorkspaceActivities(workspaceId, limit = 20) {
    try {
      const response = await http.get(`/workspaces/${workspaceId}/activities?limit=${limit}`);
      console.log('[WorkspaceService.getWorkspaceActivities] Response:', response.data);

      const activities = response.data.activities || [];

      return {
        ok: response.data.ok !== false,
        activities: Array.isArray(activities) ? activities : []
      };
    } catch (error) {
      console.error('[WorkspaceService.getWorkspaceActivities] ERROR:', error.message || error);

      return {
        ok: false,
        activities: [],
        error: error.response?.data?.message || error.message || 'Failed to fetch workspace activities'
      };
    }
  },

  /**
   * Update workspace
   * @param {string} workspaceId - Workspace ID
   * @param {Object} data - Workspace data to update
   * @param {string} data.name - Workspace name
   * @param {string} data.description - Workspace description
   * @param {string} data.visibility - Workspace visibility
   * @returns {Promise<{ok: boolean, workspace?: Object, error?: string}>}
   */
  async updateWorkspace(workspaceId, data) {
    try {
      const response = await http.put(`/workspaces/${workspaceId}`, data);
      console.log('[WorkspaceService.updateWorkspace] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        workspace: response.data.workspace || response.data.data
      };
    } catch (error) {
      console.error('[WorkspaceService.updateWorkspace] ERROR:', error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to update workspace'
      };
    }
  },

  /**
   * Delete workspace
   * @param {string} workspaceId - Workspace ID
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async deleteWorkspace(workspaceId) {
    try {
      const response = await http.delete(`/workspaces/${workspaceId}`);
      console.log('[WorkspaceService.deleteWorkspace] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        message: response.data.message
      };
    } catch (error) {
      console.error('[WorkspaceService.deleteWorkspace] ERROR:', error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to delete workspace'
      };
    }
  },

  /**
   * Get pending invitations sent for a workspace
   * @param {string|number} workspaceId - Workspace ID
   * @returns {Promise<{ok: boolean, invitations?: Array, error?: string}>}
   */
  async getPendingInvitations(workspaceId) {
    try {
      const response = await http.get(`/workspaces/${workspaceId}/invitations/pending`);
      console.log('[WorkspaceService.getPendingInvitations] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        invitations: response.data.invitations || [],
        message: response.data.message
      };
    } catch (error) {
      console.error('[WorkspaceService.getPendingInvitations] ERROR:', error.message || error);

      return {
        ok: false,
        invitations: [],
        error: error.response?.data?.message || error.message || 'Failed to fetch pending invitations'
      };
    }
  },

  /**
   * Get invitations received by current user
   * @returns {Promise<{ok: boolean, invitations?: Array, error?: string}>}
   */
  async getReceivedInvitations() {
    try {
      const response = await http.get('/workspaces/invitations/received');
      console.log('[WorkspaceService.getReceivedInvitations] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        invitations: response.data.invitations || [],
        message: response.data.message
      };
    } catch (error) {
      console.error('[WorkspaceService.getReceivedInvitations] ERROR:', error.message || error);

      return {
        ok: false,
        invitations: [],
        error: error.response?.data?.message || error.message || 'Failed to fetch received invitations'
      };
    }
  },

  /**
   * Cancel/revoke an invitation
   * @param {string|number} invitationId - Invitation ID
   * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
   */
  async cancelInvitation(invitationId) {
    try {
      const response = await http.delete(`/workspaces/invitations/${invitationId}`);
      console.log('[WorkspaceService.cancelInvitation] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        message: response.data.message
      };
    } catch (error) {
      console.error('[WorkspaceService.cancelInvitation] ERROR:', error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to cancel invitation'
      };
    }
  },

  /**
   * Resend an invitation
   * @param {string|number} invitationId - Invitation ID
   * @returns {Promise<{ok: boolean, invitation?: Object, message?: string, error?: string}>}
   */
  async resendInvitation(invitationId) {
    try {
      const response = await http.post(`/workspaces/invitations/${invitationId}/resend`);
      console.log('[WorkspaceService.resendInvitation] Response:', response.data);

      return {
        ok: response.data.ok !== false,
        invitation: response.data.invitation,
        message: response.data.message
      };
    } catch (error) {
      console.error('[WorkspaceService.resendInvitation] ERROR:', error.message || error);

      return {
        ok: false,
        error: error.response?.data?.message || error.message || 'Failed to resend invitation'
      };
    }
  },

  // Alias for removeWorkspaceMember for backward compatibility
  removeMember(workspaceId, memberId) {
    return this.removeWorkspaceMember(workspaceId, memberId);
  },

  // Alias for getWorkspaceById for backward compatibility
  getWorkspace(id) {
    return this.getWorkspaceById(id);
  },

  /**
   * Get workspaces with pagination
   * @param {Object} params - Query parameters { page, limit, search }
   * @returns {Promise<{ok: boolean, items: Array, total: number, pagination: Object}>}
   */
  async getMyWorkspacesPaginated(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.scope) queryParams.append('scope', params.scope);

      const response = await http.get(`/workspaces/my?${queryParams.toString()}`);
      console.log('[WorkspaceService.getMyWorkspacesPaginated] Response:', response.data);

      const responseData = response.data || {};
      const { ok, success, data } = responseData;

      const workspaces = data?.workspaces || data?.items || responseData.workspaces || responseData.items || [];
      const pagination = data?.pagination || responseData.pagination || {};
      const total = pagination.total || data?.total || responseData.total || workspaces.length;

      return {
        ok: ok !== false && success !== false,
        items: Array.isArray(workspaces) ? workspaces : [],
        total: total,
        pagination: pagination
      };
    } catch (error) {
      console.error('[WorkspaceService.getMyWorkspacesPaginated] ERROR:', error);

      return {
        ok: false,
        items: [],
        total: 0,
        pagination: {},
        error: error.response?.data?.message || error.message || 'Failed to fetch workspaces'
      };
    }
  },

  /**
   * Delete multiple workspaces
   * @param {Array} workspaceIds - Array of workspace IDs to delete
   * @returns {Promise<{ok: boolean, deletedCount?: number, error?: string}>}
   */
  async deleteMultipleWorkspaces(workspaceIds) {
    try {
      if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) {
        throw new Error('Workspace IDs array is required');
      }

      const response = await http.delete('/workspaces/bulk', {
        data: { workspaceIds }
      });
      console.log('[WorkspaceService.deleteMultipleWorkspaces] Response:', response.data);

      const responseData = response.data || {};
      const { ok, success, deletedCount } = responseData;

      return {
        ok: ok !== false && success !== false,
        deletedCount: deletedCount || 0,
        message: `Successfully deleted ${deletedCount || 0} workspace(s)`
      };
    } catch (error) {
      console.error('[WorkspaceService.deleteMultipleWorkspaces] ERROR:', error);

      return {
        ok: false,
        deletedCount: 0,
        error: error.response?.data?.message || error.message || 'Failed to delete workspaces'
      };
    }
  },

  /**
   * Request a role upgrade in a workspace
   * @param {string} id - Workspace ID
   * @param {string} requestedRole - The role being requested
   * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
   */
  async requestPromotion(id, requestedRole) {
    try {
      const response = await http.post(`/workspaces/${id}/request-promotion`, { requestedRole });
      return response.data;
    } catch (error) {
      console.error('[WorkspaceService.requestPromotion] ERROR:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message || 'Failed to request promotion'
      };
    }
  },

  /**
   * Approve or decline a role change request
   * @param {string} notificationId - Notification ID
   * @param {string} action - "approve" or "decline"
   * @returns {Promise<{ok: boolean, message?: string, error?: string}>}
   */
  async handleRoleRequest(notificationId, action) {
    try {
      const response = await http.post(`/workspaces/notifications/${notificationId}/handle-role-request`, { action });
      return response.data;
    } catch (error) {
      console.error('[WorkspaceService.handleRoleRequest] ERROR:', error);
      return {
        ok: false,
        message: error.response?.data?.message || error.message || 'Failed to handle role request'
      };
    }
  }
};

export default WorkspaceService;
