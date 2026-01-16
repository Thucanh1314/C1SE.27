// src/modules/auth/service/contextService.js
/**
 * Context-aware permission and UI service
 * Handles "borrowed powers" logic for Users in workspace contexts
 */

class ContextService {
  /**
   * Determine user's interface context based on system role and workspace membership
   */
  static getUserInterfaceContext(user, currentWorkspace = null) {
    const baseContext = {
      systemRole: user.role,
      userId: user.id,
      username: user.username,
      personalSurveyAccess: false,
      workspaceAccess: false,
      availableTools: [],
      canSwitchContext: false,
      interface: 'participant-only',
      borrowedPowers: false,
      contextMessage: null
    };

    // Admin: Full system access
    if (user.role === 'admin') {
      return {
        ...baseContext,
        interface: 'full-admin',
        personalSurveyAccess: true,
        workspaceAccess: true,
        availableTools: ['editor', 'analytics', 'ai', 'user-management', 'workspace-management'],
        canSwitchContext: true,
        contextMessage: 'System Administrator - Full Access'
      };
    }

    // Creator: Native creation rights
    if (user.role === 'creator') {
      const creatorContext = {
        ...baseContext,
        interface: 'creator-full',
        personalSurveyAccess: true,
        availableTools: ['editor', 'analytics', 'ai'],
        canSwitchContext: true,
        contextMessage: 'Creator - Personal & Workspace Surveys'
      };

      // Enhanced workspace access if member
      if (currentWorkspace && user.workspaceMemberships && user.workspaceMemberships[currentWorkspace.id]) {
        const workspaceRole = user.workspaceMemberships[currentWorkspace.id].role;
        if (['owner', 'collaborator', 'viewer', 'member'].includes(workspaceRole)) {
          creatorContext.workspaceAccess = true;
          creatorContext.currentWorkspace = {
            id: currentWorkspace.id,
            name: currentWorkspace.name,
            role: workspaceRole
          };
        }
      }

      return creatorContext;
    }

    // User: Context-dependent with potential borrowed powers
    if (user.role === 'user') {
      // Check workspace membership for borrowed powers
      if (currentWorkspace && user.workspaceMemberships && user.workspaceMemberships[currentWorkspace.id]) {
        const membership = user.workspaceMemberships[currentWorkspace.id];
        const workspaceRole = membership.role;

        // Borrowed powers for Collaborator+ roles
        if (['owner', 'collaborator'].includes(workspaceRole)) {
          return {
            ...baseContext,
            interface: 'borrowed-creator',
            workspaceAccess: true,
            availableTools: ['editor', 'ai', 'workspace-analytics'],
            borrowedPowers: true,
            currentWorkspace: {
              id: currentWorkspace.id,
              name: currentWorkspace.name,
              role: workspaceRole
            },
            contextMessage: `Working as ${workspaceRole.toUpperCase()} in ${currentWorkspace.name}`,
            restrictions: {
              personalSurveys: false,
              workspaceSurveys: true,
              fullAnalytics: false
            }
          };
        }

        // Viewer: Read-only access
        if (workspaceRole === 'viewer') {
          return {
            ...baseContext,
            interface: 'workspace-viewer',
            workspaceAccess: true,
            availableTools: ['view-surveys', 'basic-analytics'],
            currentWorkspace: {
              id: currentWorkspace.id,
              name: currentWorkspace.name,
              role: workspaceRole
            },
            contextMessage: `Viewing ${currentWorkspace.name} as ${workspaceRole.toUpperCase()}`
          };
        }

        // Member: Participation only
        if (workspaceRole === 'member') {
          return {
            ...baseContext,
            interface: 'workspace-member',
            workspaceAccess: true,
            availableTools: ['survey-participant'],
            currentWorkspace: {
              id: currentWorkspace.id,
              name: currentWorkspace.name,
              role: workspaceRole
            },
            contextMessage: `Member of ${currentWorkspace.name}`
          };
        }
      }

      // Default user: No workspace context
      return {
        ...baseContext,
        contextMessage: 'Survey Participant - Join a workspace to create surveys'
      };
    }

    return baseContext;
  }

  /**
   * Check if user can create surveys in given context
   */
  static canCreateSurvey(user, workspace = null) {
    // Personal survey creation
    if (!workspace) {
      return ['admin', 'creator'].includes(user.role);
    }

    // Workspace survey creation
    if (user.role === 'admin') return true;

    if (workspace && user.workspaceMemberships && user.workspaceMemberships[workspace.id]) {
      const workspaceRole = user.workspaceMemberships[workspace.id].role;
      
      // Creator with sufficient workspace role
      if (user.role === 'creator' && ['owner', 'collaborator'].includes(workspaceRole)) {
        return true;
      }

      // User with borrowed powers
      if (user.role === 'user' && ['owner', 'collaborator'].includes(workspaceRole)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get notification eligibility based on role and context
   */
  static getNotificationEligibility(user, workspace, surveyStatus) {
    if (!workspace || !user.workspaceMemberships || !user.workspaceMemberships[workspace.id]) {
      return false;
    }

    const workspaceRole = user.workspaceMemberships[workspace.id].role;
    
    // Managers get all notifications
    if (['owner', 'collaborator', 'viewer'].includes(workspaceRole)) {
      return true;
    }

    // Members only get active survey notifications
    if (workspaceRole === 'member') {
      return surveyStatus === 'active';
    }

    return false;
  }

  /**
   * Get appropriate action URL based on user context and next action
   */
  static getActionUrl(user, action, surveyId, workspaceId = null) {
    const context = this.getUserInterfaceContext(user, workspaceId ? { id: workspaceId } : null);
    
    switch (action) {
      case 'survey_created':
      case 'survey_updated':
        if (context.borrowedPowers || context.interface === 'creator-full' || context.interface === 'full-admin') {
          return `/creator/surveys/${surveyId}/edit`;
        }
        return `/surveys/${surveyId}`;

      case 'survey_active':
        return `/surveys/${surveyId}`; // Everyone goes to participation page

      case 'survey_deleted':
        if (workspaceId) {
          return `/creator/workspaces/${workspaceId}`;
        }
        return '/creator/dashboard';

      case 'workspace_event':
        return `/creator/workspaces/${workspaceId}`;

      default:
        return context.borrowedPowers ? `/creator/surveys/${surveyId}/edit` : `/surveys/${surveyId}`;
    }
  }

  /**
   * Get redirect URL after leaving workspace based on system role
   */
  static getPostLeaveRedirectUrl(systemRole, nextAction) {
    const redirectMap = {
      'redirect_admin_dashboard': '/admin/dashboard',
      'redirect_personal_dashboard': '/creator/dashboard', 
      'redirect_creator_dashboard': '/creator/dashboard',
      'redirect_user_dashboard': '/dashboard'
    };

    return redirectMap[nextAction] || '/dashboard';
  }

  /**
   * Update user context after workspace operations (leave, role change)
   */
  static updateUserContextAfterWorkspaceChange(user, changedWorkspaceId, operation) {
    // Remove workspace from user's memberships if they left
    if (operation === 'leave' && user.workspaceMemberships) {
      delete user.workspaceMemberships[changedWorkspaceId];
    }

    // Return updated context
    return this.getUserInterfaceContext(user, null);
  }
}


module.exports = ContextService;