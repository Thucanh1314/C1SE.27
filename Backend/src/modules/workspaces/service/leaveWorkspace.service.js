// src/modules/workspaces/service/leaveWorkspace.service.js
/**
 * Handle workspace leave scenarios based on System Role and Workspace Role
 * Implements data integrity and access control according to role matrix
 */

const { WorkspaceMember, Survey, SurveyResponse, Workspace, User, Notification } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');

class LeaveWorkspaceService {
  /**
   * Main method to handle leaving workspace with role-specific logic
   */
  static async leaveWorkspace(userId, workspaceId, user) {
    try {
      // Get current membership
      const membership = await WorkspaceMember.findOne({
        where: { user_id: userId, workspace_id: workspaceId },
        include: [{
          model: Workspace,
          as: 'workspace',
          include: [{
            model: User,
            as: 'owner',
            attributes: ['id', 'role']
          }]
        }]
      });

      if (!membership) {
        throw new Error('User is not a member of this workspace');
      }

      const workspace = membership.workspace;
      const userSystemRole = user.role;
      const workspaceRole = membership.role;

      // Execute role-specific leave logic
      const leaveResult = await this._executeRoleSpecificLeave(
        userId, 
        workspaceId, 
        userSystemRole, 
        workspaceRole, 
        workspace
      );

      // Remove membership
      await membership.destroy();

      // Log the leave action
      logger.info(`User ${userId} (${userSystemRole}) left workspace ${workspaceId} as ${workspaceRole}`);

      return {
        success: true,
        message: leaveResult.message,
        dataIntegrity: leaveResult.dataIntegrity,
        accessChanges: leaveResult.accessChanges,
        nextAction: leaveResult.nextAction
      };

    } catch (error) {
      logger.error('Leave workspace error:', error);
      throw error;
    }
  }

  /**
   * Execute role-specific leave logic based on system role + workspace role combination
   */
  static async _executeRoleSpecificLeave(userId, workspaceId, systemRole, workspaceRole, workspace) {
    const scenario = `${systemRole}_${workspaceRole}`;

    switch (scenario) {
      case 'admin_owner':
        return await this._handleAdminOwnerLeave(userId, workspaceId, workspace);

      case 'creator_owner':
        return await this._handleCreatorOwnerLeave(userId, workspaceId, workspace);

      case 'creator_collaborator':
        return await this._handleCreatorCollaboratorLeave(userId, workspaceId);

      case 'creator_member':
      case 'creator_viewer':
        return await this._handleCreatorMemberLeave(userId, workspaceId);

      case 'user_collaborator':
        return await this._handleUserCollaboratorLeave(userId, workspaceId);

      case 'user_member':
      case 'user_viewer':
        return await this._handleUserMemberLeave(userId, workspaceId);

      default:
        throw new Error(`Unsupported role combination: ${scenario}`);
    }
  }

  /**
   * Admin Owner Leave: Keep data, lose workspace from management list
   */
  static async _handleAdminOwnerLeave(userId, workspaceId, workspace) {
    // Check if there's another owner to take over
    const otherOwners = await WorkspaceMember.findAll({
      where: {
        workspace_id: workspaceId,
        user_id: { [Op.ne]: userId },
        role: 'owner'
      }
    });

    if (otherOwners.length === 0) {
      // Find most senior collaborator to promote
      const seniorCollaborator = await WorkspaceMember.findOne({
        where: {
          workspace_id: workspaceId,
          role: 'collaborator'
        },
        order: [['created_at', 'ASC']]
      });

      if (seniorCollaborator) {
        await seniorCollaborator.update({ role: 'owner' });
      }
    }

    return {
      message: 'Admin successfully left workspace. All data remains intact.',
      dataIntegrity: 'Toàn bộ khảo sát và kết quả vẫn nằm lại Workspace.',
      accessChanges: 'Vẫn giữ quyền Admin hệ thống nhưng không còn thấy Workspace này trong danh sách quản lý.',
      nextAction: 'redirect_admin_dashboard'
    };
  }

  /**
   * Creator Owner Leave: Must transfer ownership first
   */
  static async _handleCreatorOwnerLeave(userId, workspaceId, workspace) {
    // Check if user is the only owner
    const ownerCount = await WorkspaceMember.count({
      where: {
        workspace_id: workspaceId,
        role: 'owner'
      }
    });

    if (ownerCount === 1) {
      // Check for potential successors
      const collaborators = await WorkspaceMember.findAll({
        where: {
          workspace_id: workspaceId,
          role: 'collaborator'
        },
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'role']
        }]
      });

      if (collaborators.length === 0) {
        throw new Error('Cannot leave workspace. No collaborators available to transfer ownership. Please add a collaborator or delete the workspace.');
      }

      throw new Error(`Cannot leave workspace. You are the only owner. Please transfer ownership to one of: ${collaborators.map(c => c.user.username).join(', ')}`);
    }

    return {
      message: 'Creator owner successfully left workspace.',
      dataIntegrity: 'Workspace không thể không có Owner. Quyền Owner đã được chuyển cho người khác.',
      accessChanges: 'Mất quyền quản trị Workspace. Quay về Dashboard cá nhân với các khảo sát cá nhân cũ.',
      nextAction: 'redirect_personal_dashboard'
    };
  }

  /**
   * Creator Collaborator Leave: Keep created surveys in workspace
   */
  static async _handleCreatorCollaboratorLeave(userId, workspaceId) {
    // Count surveys created by this user in workspace
    const surveysCount = await Survey.count({
      where: {
        created_by: userId,
        workspace_id: workspaceId
      }
    });

    // Surveys remain in workspace (data integrity maintained)
    // No ownership transfer needed for surveys

    return {
      message: `Creator collaborator left workspace. ${surveysCount} surveys remain in workspace.`,
      dataIntegrity: 'Mọi khảo sát họ đã soạn thảo trong Workspace vẫn được giữ lại cho nhóm.',
      accessChanges: 'Mất quyền sửa/xóa các khảo sát trong Workspace đó. Menu Workspace biến mất khỏi Sidebar.',
      nextAction: 'redirect_creator_dashboard'
    };
  }

  /**
   * Creator Member/Viewer Leave: Minimal impact
   */
  static async _handleCreatorMemberLeave(userId, workspaceId) {
    // Clean up notifications
    await this._cleanupUserNotifications(userId, workspaceId);

    return {
      message: 'Creator member/viewer successfully left workspace.',
      dataIntegrity: 'Không ảnh hưởng đến dữ liệu chung. Các phản hồi (nếu có) vẫn được lưu lại.',
      accessChanges: 'Trở về giao diện Creator bình thường, không còn thấy các khảo sát nội bộ của nhóm.',
      nextAction: 'redirect_creator_dashboard'
    };
  }

  /**
   * User Collaborator Leave: Lose borrowed powers, surveys stay in workspace
   */
  static async _handleUserCollaboratorLeave(userId, workspaceId) {
    // Count surveys created with borrowed powers
    const borrowedSurveys = await Survey.count({
      where: {
        created_by: userId,
        workspace_id: workspaceId
      }
    });

    // Clean up notifications
    await this._cleanupUserNotifications(userId, workspaceId);

    return {
      message: `User collaborator left workspace. Lost borrowed powers. ${borrowedSurveys} surveys remain in workspace.`,
      dataIntegrity: 'Khảo sát họ đã tạo (mượn quyền) vẫn thuộc về Workspace. Họ không thể mang khảo sát đó đi.',
      accessChanges: 'Mất hoàn toàn các quyền "mượn" (Editor, AI Generator). Sidebar trở về bản rút gọn của User.',
      nextAction: 'redirect_user_dashboard'
    };
  }

  /**
   * User Member/Viewer Leave: Keep research data intact
   */
  static async _handleUserMemberLeave(userId, workspaceId) {
    // Count responses for research integrity
    const responsesCount = await SurveyResponse.count({
      where: {
        respondent_id: userId,
        survey_id: {
          [Op.in]: await Survey.findAll({
            where: { workspace_id: workspaceId },
            attributes: ['id']
          }).then(surveys => surveys.map(s => s.id))
        }
      }
    });

    // Clean up notifications
    await this._cleanupUserNotifications(userId, workspaceId);

    return {
      message: `User member/viewer left workspace. ${responsesCount} responses preserved for research integrity.`,
      dataIntegrity: 'Phản hồi của họ vẫn nằm trong mẫu nghiên cứu (để đảm bảo tính chính xác của NCKH).',
      accessChanges: 'Không còn nhận được thông báo hay thấy khảo sát nội bộ của Workspace đó.',
      nextAction: 'redirect_user_dashboard'
    };
  }

  /**
   * Clean up user notifications related to workspace
   */
  static async _cleanupUserNotifications(userId, workspaceId) {
    try {
      const deletedCount = await Notification.destroy({
        where: {
          user_id: userId,
          related_workspace_id: workspaceId,
          is_read: false // Only remove unread notifications
        }
      });

      logger.info(`Cleaned up ${deletedCount} unread notifications for user ${userId} from workspace ${workspaceId}`);
    } catch (error) {
      logger.error('Notification cleanup error:', error);
      // Don't throw - this is cleanup, not critical
    }
  }

  /**
   * Transfer workspace ownership (for Creator Owner scenario)
   */
  static async transferOwnership(currentOwnerId, workspaceId, newOwnerId) {
    try {
      // Verify current owner
      const currentOwner = await WorkspaceMember.findOne({
        where: {
          user_id: currentOwnerId,
          workspace_id: workspaceId,
          role: 'owner'
        }
      });

      if (!currentOwner) {
        throw new Error('Current user is not an owner of this workspace');
      }

      // Verify new owner is a member
      const newOwnerMembership = await WorkspaceMember.findOne({
        where: {
          user_id: newOwnerId,
          workspace_id: workspaceId
        }
      });

      if (!newOwnerMembership) {
        throw new Error('New owner must be a workspace member');
      }

      // Transfer ownership
      await newOwnerMembership.update({ role: 'owner' });

      logger.info(`Ownership transferred from user ${currentOwnerId} to user ${newOwnerId} for workspace ${workspaceId}`);

      return {
        success: true,
        message: 'Ownership transferred successfully'
      };

    } catch (error) {
      logger.error('Ownership transfer error:', error);
      throw error;
    }
  }

  /**
   * Get leave preview (what will happen if user leaves)
   */
  static async getLeavePreview(userId, workspaceId, user) {
    try {
      const membership = await WorkspaceMember.findOne({
        where: { user_id: userId, workspace_id: workspaceId }
      });

      if (!membership) {
        throw new Error('User is not a member of this workspace');
      }

      const userSystemRole = user.role;
      const workspaceRole = membership.role;
      const scenario = `${userSystemRole}_${workspaceRole}`;

      // Get data counts
      const surveysCreated = await Survey.count({
        where: { created_by: userId, workspace_id: workspaceId }
      });

      const responsesGiven = await SurveyResponse.count({
        where: {
          respondent_id: userId,
          survey_id: {
            [Op.in]: await Survey.findAll({
              where: { workspace_id: workspaceId },
              attributes: ['id']
            }).then(surveys => surveys.map(s => s.id))
          }
        }
      });

      // Generate preview based on scenario
      const preview = this._generateLeavePreview(scenario, surveysCreated, responsesGiven);

      return {
        scenario,
        systemRole: userSystemRole,
        workspaceRole: workspaceRole,
        dataImpact: {
          surveysCreated,
          responsesGiven
        },
        preview
      };

    } catch (error) {
      logger.error('Leave preview error:', error);
      throw error;
    }
  }

  /**
   * Generate leave preview message
   */
  static _generateLeavePreview(scenario, surveysCreated, responsesGiven) {
    const previews = {
      'admin_owner': {
        dataIntegrity: 'All surveys and results remain in workspace',
        accessChanges: 'Workspace will disappear from your admin management list',
        canLeave: true,
        warning: null
      },
      'creator_owner': {
        dataIntegrity: 'Ownership must be transferred to another member first',
        accessChanges: 'Will lose workspace management rights',
        canLeave: false,
        warning: 'You are the only owner. Transfer ownership before leaving.'
      },
      'creator_collaborator': {
        dataIntegrity: `${surveysCreated} surveys will remain in workspace for the team`,
        accessChanges: 'Will lose edit/delete rights for workspace surveys',
        canLeave: true,
        warning: null
      },
      'creator_member': {
        dataIntegrity: `${responsesGiven} responses will be preserved`,
        accessChanges: 'Will return to normal Creator interface',
        canLeave: true,
        warning: null
      },
      'creator_viewer': {
        dataIntegrity: `${responsesGiven} responses will be preserved`,
        accessChanges: 'Will return to normal Creator interface',
        canLeave: true,
        warning: null
      },
      'user_collaborator': {
        dataIntegrity: `${surveysCreated} surveys created with borrowed powers will remain in workspace`,
        accessChanges: 'Will lose all borrowed powers (Editor, AI Generator)',
        canLeave: true,
        warning: 'You will lose creator capabilities gained from this workspace'
      },
      'user_member': {
        dataIntegrity: `${responsesGiven} responses will be preserved for research integrity`,
        accessChanges: 'Will stop receiving workspace notifications',
        canLeave: true,
        warning: null
      },
      'user_viewer': {
        dataIntegrity: `${responsesGiven} responses will be preserved for research integrity`,
        accessChanges: 'Will stop receiving workspace notifications',
        canLeave: true,
        warning: null
      }
    };

    return previews[scenario] || {
      dataIntegrity: 'Unknown scenario',
      accessChanges: 'Unknown changes',
      canLeave: false,
      warning: 'Please contact administrator'
    };
  }
}

module.exports = LeaveWorkspaceService;