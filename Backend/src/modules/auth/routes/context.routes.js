// src/modules/auth/routes/context.routes.js
const express = require('express');
const { authenticate } = require('../../../middleware/auth.middleware');
const ContextService = require('../service/contextService');
const { WorkspaceMember, Workspace } = require('../../../models');

const router = express.Router();

/**
 * GET /api/auth/context
 * Get current user's interface context
 */
router.get('/context', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const workspaceId = req.query.workspace_id;

    // Load user's workspace memberships
    const memberships = await WorkspaceMember.findAll({
      where: { user_id: user.id },
      include: [{
        model: Workspace,
        as: 'workspace',
        attributes: ['id', 'name', 'description']
      }]
    });

    // Format memberships for easy access
    user.workspaceMemberships = {};
    const workspacesList = [];
    
    memberships.forEach(membership => {
      user.workspaceMemberships[membership.workspace_id] = {
        role: membership.role,
        workspace: membership.workspace
      };
      workspacesList.push({
        id: membership.workspace_id,
        name: membership.workspace.name,
        role: membership.role
      });
    });

    // Get current workspace if specified
    let currentWorkspace = null;
    if (workspaceId && user.workspaceMemberships[workspaceId]) {
      currentWorkspace = {
        id: workspaceId,
        name: user.workspaceMemberships[workspaceId].workspace.name
      };
    }

    // Get interface context
    const context = ContextService.getUserInterfaceContext(user, currentWorkspace);

    res.json({
      success: true,
      data: {
        ...context,
        workspaces: workspacesList,
        canCreatePersonalSurvey: ContextService.canCreateSurvey(user, null),
        canCreateWorkspaceSurvey: currentWorkspace ? ContextService.canCreateSurvey(user, currentWorkspace) : false
      }
    });
  } catch (error) {
    console.error('Context error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user context',
      error: error.message
    });
  }
});

/**
 * GET /api/auth/context/capabilities
 * Get user's capabilities in specific workspace
 */
router.get('/context/capabilities', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const workspaceId = req.query.workspace_id;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'workspace_id is required'
      });
    }

    // Check workspace membership
    const membership = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: user.id },
      include: [{
        model: Workspace,
        as: 'workspace',
        attributes: ['id', 'name']
      }]
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this workspace'
      });
    }

    const workspace = { id: workspaceId, name: membership.workspace.name };
    user.workspaceMemberships = { [workspaceId]: { role: membership.role } };

    const context = ContextService.getUserInterfaceContext(user, workspace);

    res.json({
      success: true,
      data: {
        workspaceId,
        workspaceName: membership.workspace.name,
        userSystemRole: user.role,
        workspaceRole: membership.role,
        capabilities: {
          canCreateSurvey: ContextService.canCreateSurvey(user, workspace),
          canEditSurveys: ['owner', 'collaborator'].includes(membership.role) || user.role === 'admin',
          canViewDrafts: ['owner', 'collaborator', 'viewer'].includes(membership.role) || user.role === 'admin',
          canManageWorkspace: membership.role === 'owner' || user.role === 'admin',
          hasAnalyticsAccess: ['owner', 'collaborator', 'viewer'].includes(membership.role) || user.role === 'admin'
        },
        interface: context.interface,
        availableTools: context.availableTools,
        borrowedPowers: context.borrowedPowers,
        contextMessage: context.contextMessage
      }
    });
  } catch (error) {
    console.error('Capabilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get capabilities',
      error: error.message
    });
  }
});

module.exports = router;