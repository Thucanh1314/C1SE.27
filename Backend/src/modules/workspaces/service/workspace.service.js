// src/modules/workspaces/service/workspace.service.js
const { Workspace, WorkspaceMember, WorkspaceInvitation, WorkspaceActivity, User, Survey } = require('../../../models');
const { Op } = require('sequelize');
const logger = require('../../../utils/logger');
const crypto = require('crypto');
const emailService = require('../../../utils/email.service');
const notificationService = require('../../notifications/service/notification.service');
const activityService = require('./activity.service');

class WorkspaceService {
  /**
   * Get workspaces where user is owner or member (admin sees all)
   */
  async getMyWorkspaces(userId, user = null) {
    const includeConfig = [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'username', 'email']
      },
      {
        model: WorkspaceMember,
        as: 'members',
        attributes: ['id', 'user_id', 'role'],
        required: false
      },
      {
        model: Survey,
        as: 'surveys',
        attributes: ['id']
      }
    ];

    let whereCondition = {};

    // Admin can see all workspaces
    if (user && user.role === 'admin') {
      // No where condition - admin sees all workspaces
      includeConfig[1].required = false;
    } else {
      // Regular users see only their workspaces
      // Use subquery approach to avoid column reference issues
      const memberWorkspaceIds = await WorkspaceMember.findAll({
        where: { user_id: userId },
        attributes: ['workspace_id']
      }).then(results => results.map(r => r.workspace_id));

      // Build condition - handle empty memberWorkspaceIds
      const conditions = [{ owner_id: userId }];

      if (memberWorkspaceIds.length > 0) {
        conditions.push({ id: { [Op.in]: memberWorkspaceIds } });
      }

      whereCondition = {
        [Op.or]: conditions
      };

      includeConfig[1].required = false;
    }

    const workspaces = await Workspace.findAll({
      include: includeConfig,
      where: whereCondition
    });

    // Map workspaces to include role and surveyCount
    return workspaces.map(ws => {
      const wsData = ws.toJSON();
      let userRole = 'member';

      // Determine user role
      if (user && user.role === 'admin') {
        userRole = 'admin';
      } else if (wsData.owner_id === userId) {
        userRole = 'owner';
      } else {
        const userMembership = wsData.members && wsData.members.find(m => m.user_id === userId);
        userRole = userMembership?.role || 'member';
      }

      return {
        id: wsData.id,
        name: wsData.name,
        description: wsData.description,
        owner_id: wsData.owner_id,
        owner: wsData.owner,
        role: userRole,
        current_user_role: userRole, // Added per requirement
        surveyCount: (wsData.surveys || []).length,
        createdAt: wsData.created_at,
        members: wsData.members || []
      };
    });
  }

  /**
   * Get workspaces with pagination
   */
  async getMyWorkspacesPaginated(userId, user = null, options = {}) {
    const { page = 1, limit = 10, search = '', scope = 'my' } = options;
    const offset = (page - 1) * limit;

    const includeConfig = [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'username', 'email', 'full_name']
      },
      {
        model: WorkspaceMember,
        as: 'members',
        attributes: ['id', 'user_id', 'role'],
        required: false
      },
      {
        model: Survey,
        as: 'surveys',
        attributes: ['id']
      }
    ];

    let whereCondition = {};

    // Determine filter based on scope and role
    // Default to 'my' workspaces behavior
    let showAll = false;

    // Only Admin can see ALL, and only if they explicitly requested it
    if (user && user.role === 'admin' && scope === 'all') {
      showAll = true;
    }

    if (showAll) {
      // Admin seeing ALL workspaces: No filter on owner/members
      // check if includeConfig[1] exists and is correct model
      if (includeConfig[1] && includeConfig[1].as === 'members') {
        includeConfig[1].required = false;
      }
    } else {
      // "My Workspaces" logic
      // Applies to:
      // 1. Regular users (always)
      // 2. Admins who selected "My Workspaces" (scope='my')

      const memberWorkspaceIds = await WorkspaceMember.findAll({
        where: { user_id: userId },
        attributes: ['workspace_id']
      }).then(results => results.map(r => r.workspace_id));

      // Build condition - handle empty memberWorkspaceIds to avoid SQL errors
      const conditions = [{ owner_id: userId }];

      if (memberWorkspaceIds.length > 0) {
        conditions.push({ id: { [Op.in]: memberWorkspaceIds } });
      }

      whereCondition = {
        [Op.or]: conditions
      };

      // Ensure member join is not required when filtering by ID/Owner
      if (includeConfig[1] && includeConfig[1].as === 'members') {
        includeConfig[1].required = false;
      }
    }

    // Add search condition
    if (search) {
      whereCondition = {
        ...whereCondition,
        [Op.and]: [
          whereCondition,
          {
            [Op.or]: [
              { name: { [Op.like]: `%${search}%` } },
              { description: { [Op.like]: `%${search}%` } }
            ]
          }
        ]
      };
    }

    const { count, rows } = await Workspace.findAndCountAll({
      include: includeConfig,
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    // Map workspaces to include role and surveyCount
    const workspaces = rows.map(ws => {
      const wsData = ws.toJSON();
      let userRole = 'member';

      // Determine user role
      if (user && user.role === 'admin') {
        userRole = 'admin';
      } else if (wsData.owner_id === userId) {
        userRole = 'owner';
      } else {
        const userMembership = wsData.members && wsData.members.find(m => m.user_id === userId);
        userRole = userMembership?.role || 'member';
      }

      return {
        id: wsData.id,
        name: wsData.name,
        description: wsData.description,
        owner_id: wsData.owner_id,
        owner: wsData.owner,
        role: userRole,
        current_user_role: userRole, // Added per requirement
        surveyCount: (wsData.surveys || []).length,
        createdAt: wsData.created_at,
        members: wsData.members || []
      };
    });

    return {
      workspaces,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Log workspace activity
   */
  async logActivity(workspaceId, userId, action, targetType = null, targetId = null, metadata = null, io = null) {
    return activityService.logActivity({
      workspaceId,
      userId,
      action,
      targetType,
      targetId,
      metadata,
      io
    });
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(data, userId, io = null) {
    const { name, description } = data;

    if (!name || name.trim() === '') {
      throw new Error('Workspace name is required');
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      description: description || null,
      owner_id: userId,
      is_active: true
    });

    // Add owner as a workspace member
    await WorkspaceMember.create({
      workspace_id: workspace.id,
      user_id: userId,
      role: 'owner'
    });

    logger.info(`Workspace created: id=${workspace.id}, owner_id=${userId}, name=${name}`);

    return this.getWorkspaceById(workspace.id, userId);
  }

  /**
   * Get workspace by ID with validation
   */
  async getWorkspaceById(workspaceId, userId) {
    const workspace = await Workspace.findByPk(workspaceId, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'email', 'full_name']
        },
        {
          model: WorkspaceMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'username', 'email', 'full_name']
            }
          ]
        },
        {
          model: Survey,
          as: 'surveys',
          attributes: ['id', 'title', 'status', 'access_type', 'created_by']
        }
      ]
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check if user has access
    const isOwner = workspace.owner_id === userId;
    const isMember = workspace.members && workspace.members.some(m => m.user_id === userId);

    if (!isOwner && !isMember) {
      throw new Error('Access denied. You are not a member of this workspace');
    }

    const wsData = workspace.toJSON();

    // Determine current user's role
    let userRole = 'member';
    if (isOwner) {
      userRole = 'owner';
    } else if (isMember) {
      const userMembership = wsData.members.find(m => m.user_id === userId);
      userRole = userMembership?.role || 'member';
    }

    return {
      id: wsData.id,
      name: wsData.name,
      description: wsData.description,
      owner_id: wsData.owner_id,
      owner: wsData.owner,
      owner: wsData.owner,
      role: userRole,
      current_user_role: userRole, // Added per requirement
      visibility: wsData.visibility,
      members: wsData.members.map(m => ({
        id: m.id,
        user_id: m.user_id,
        email: m.user?.email,
        full_name: m.user?.full_name,
        username: m.user?.username,
        role: m.role
      })),
      surveys: wsData.surveys,
      surveyCount: wsData.surveys.length
    };
  }

  /**
   * Add member to workspace (owner only)
   */
  async addMember(workspaceId, userId, newMemberId, role, currentUserId, io = null) {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check if current user is owner
    if (workspace.owner_id !== currentUserId) {
      throw new Error('Only the workspace owner can add members');
    }

    // Validate role
    const validRoles = ['owner', 'collaborator', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check if new member exists
    const newUser = await User.findByPk(newMemberId);
    if (!newUser) {
      throw new Error('User not found');
    }

    // Create or update membership
    const [member, created] = await WorkspaceMember.findOrCreate({
      where: {
        workspace_id: workspaceId,
        user_id: newMemberId
      },
      defaults: {
        role
      }
    });

    if (!created) {
      // Update existing membership
      await member.update({ role });
    }

    // Send notification if member was added
    if (created) {
      try {
        const currentUser = await User.findByPk(currentUserId);
        await notificationService.notifyMemberAdded(
          newMemberId,
          workspaceId,
          workspace.name,
          currentUser?.full_name || currentUser?.username || 'A user',
          io // Pass io for real-time notifications
        );
      } catch (notifError) {
        logger.warn(`[WorkspaceService] Failed to notify member: ${notifError.message}`);
      }
    }

    logger.info(
      `Workspace member ${created ? 'added' : 'updated'}: workspace_id=${workspaceId}, user_id=${newMemberId}, role=${role}`
    );

    return member;
  }

  /**
   * Remove member from workspace (owner only)
   */
  async removeMember(workspaceId, memberId, currentUserId, io = null) {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const ownerId = parseInt(workspace.owner_id);
    const userId = parseInt(currentUserId);

    // Check if current user is owner
    if (ownerId !== userId) {
      throw new Error('Only the workspace owner can remove members');
    }

    const member = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: memberId
      }
    });

    if (!member) {
      return { message: 'Member not found, nothing to remove' };
    }

    // Before destroying, perform cleanup
    await this._cleanupMemberExit(workspace, memberId, io);

    await member.destroy();

    // Log activity
    await this.logActivity(workspaceId, userId, 'member_removed', 'user', memberId, {
      action: 'removed'
    }, io);

    logger.info(`Workspace member removed: workspace_id=${workspaceId}, user_id=${memberId}`);

    return { message: 'Member removed successfully' };
  }

  /**
   * Update member role (owner only)
   */
  async updateMemberRole(workspaceId, memberId, newRole, currentUserId, io = null) {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const ownerId = parseInt(workspace.owner_id);
    const userId = parseInt(currentUserId);

    // Check if current user is owner
    if (ownerId !== userId) {
      throw new Error('Only the workspace owner can change member roles');
    }

    // Validate role
    const validRoles = ['owner', 'collaborator', 'member', 'viewer'];
    if (!validRoles.includes(newRole)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Find the member
    const member = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: memberId
      }
    });

    if (!member) {
      throw new Error('Member not found in workspace');
    }

    // Prevent changing the owner's role
    if (parseInt(memberId) === ownerId) {
      throw new Error('Cannot change the owner\'s role. Transfer ownership first.');
    }

    const oldRole = member.role;
    await member.update({ role: newRole });

    // Log activity
    await this.logActivity(workspaceId, currentUserId, 'member_role_updated', 'user', memberId, {
      old_role: oldRole,
      new_role: newRole
    }, io); // Pass io

    logger.info(`Member role updated: workspace_id=${workspaceId}, user_id=${memberId}, old_role=${oldRole}, new_role=${newRole}`);

    return {
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      message: 'Member role updated successfully'
    };
  }

  /**
   * Leave workspace (members only, not owner)
   */
  async leaveWorkspace(workspaceId, userId, io = null) {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const ownerId = parseInt(workspace.owner_id);
    const currentUserId = parseInt(userId);

    // Prevent owner from leaving
    if (ownerId === currentUserId) {
      throw new Error('Workspace owner cannot leave. Transfer ownership first.');
    }

    // Find the member
    const member = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: userId
      }
    });

    if (!member) {
      throw new Error('You are not a member of this workspace');
    }

    // Before destroying, perform cleanup
    await this._cleanupMemberExit(workspace, userId, io);

    await member.destroy();

    // Log activity
    await this.logActivity(workspaceId, userId, 'left', 'user', userId, null, io);

    logger.info(`User left workspace: workspace_id=${workspaceId}, user_id=${userId}`);

    return { message: 'Successfully left workspace' };
  }

  /**
   * Transfer ownership to another member (owner only)
   */
  async transferOwnership(workspaceId, newOwnerId, currentUserId) {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const ownerId = parseInt(workspace.owner_id);
    const userId = parseInt(currentUserId);
    const newOwner = parseInt(newOwnerId);

    // Check if current user is owner
    if (ownerId !== userId) {
      throw new Error('Only the workspace owner can transfer ownership');
    }

    // Prevent transferring to self
    if (ownerId === newOwner) {
      throw new Error('You are already the owner');
    }

    // Check if new owner is a member
    const newOwnerMember = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: newOwnerId
      }
    });

    if (!newOwnerMember) {
      throw new Error('New owner must be a member of the workspace');
    }

    // Check if new owner user exists
    const newOwnerUser = await User.findByPk(newOwnerId);
    if (!newOwnerUser) {
      throw new Error('New owner user not found');
    }

    // Update workspace owner
    await workspace.update({ owner_id: newOwnerId });

    // Update old owner's role to collaborator
    const oldOwnerMember = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: currentUserId
      }
    });

    if (oldOwnerMember) {
      await oldOwnerMember.update({ role: 'collaborator' });
    }

    // Update new owner's role to owner
    await newOwnerMember.update({ role: 'owner' });

    // Log activity
    await this.logActivity(workspaceId, currentUserId, 'ownership_transferred', 'user', newOwnerId, {
      old_role: currentUserId,
      new_role: newOwnerId
    });

    logger.info(`Ownership transferred: workspace_id=${workspaceId}, old_owner=${currentUserId}, new_owner=${newOwnerId}`);

    return {
      message: 'Ownership transferred successfully',
      new_owner_id: newOwnerId,
      workspace_id: workspaceId
    };
  }


  /**
   * Check if user is a member of workspace
   */
  async isWorkspaceMember(workspaceId, userId) {
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return false;
    }

    // Owner is always a member
    if (workspace.owner_id === userId) {
      return true;
    }

    // Check if in members table
    const member = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: userId
      }
    });

    return !!member;
  }

  /**
   * Check if user has access to workspace (owner, member, or admin)
   */
  async userHasWorkspaceAccess(userId, workspaceId, user = null) {
    // Admins always have access
    if (user && user.role === 'admin') {
      return true;
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return false;
    }

    // Owner has access
    if (workspace.owner_id === userId) {
      return true;
    }

    // Check membership
    return this.isWorkspaceMember(workspaceId, userId);
  }

  /**
   * Check if user is manager or owner of workspace
   */
  async userIsWorkspaceManagerOrOwner(userId, workspaceId, user = null) {
    // Admins are considered managers
    if (user && user.role === 'admin') {
      return true;
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      return false;
    }

    // Owner is manager
    if (workspace.owner_id === userId) {
      return true;
    }

    // Check if user has owner or collaborator role in workspace
    const member = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: userId,
        role: { [Op.in]: ['owner', 'collaborator'] }
      }
    });

    return !!member;
  }

  /**
   * List surveys in a workspace (workspace members only)
   */
  async listSurveysByWorkspace(workspaceId, userId, user = null) {
    // Check workspace exists
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      const error = new Error('Workspace not found');
      error.code = 'WORKSPACE_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Check user has access
    const hasAccess = await this.userHasWorkspaceAccess(userId, workspaceId, user);
    if (!hasAccess) {
      const error = new Error('Access denied');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // Get surveys in workspace
    const surveys = await Survey.findAll({
      where: { workspace_id: workspaceId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email']
        },
        {
          model: Workspace,
          as: 'workspace',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return {
      workspaceId,
      surveys: surveys.map(s => ({
        id: s.id,
        title: s.title,
        status: s.status,
        visibility: s.visibility || null,
        access_scope: s.access_scope || null,
        created_at: s.created_at,
        updated_at: s.updated_at,
        creator: s.creator ? { id: s.creator.id, email: s.creator.email } : null,
        workspace: s.workspace ? { id: s.workspace.id, name: s.workspace.name } : null
      }))
    };
  }

  /**
   * Invite user to workspace (owner/manager only)
   */
  async inviteMember(workspaceId, newUserId, role = 'member', currentUserId, currentUser = null) {
    // Check workspace exists
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      const error = new Error('Workspace not found');
      error.code = 'WORKSPACE_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Check if current user is owner or manager
    const isManager = await this.userIsWorkspaceManagerOrOwner(currentUserId, workspaceId, currentUser);
    if (!isManager) {
      const error = new Error('Only workspace owner or manager can invite members');
      error.code = 'FORBIDDEN';
      error.status = 403;
      throw error;
    }

    // Check if new user exists
    const newUser = await User.findByPk(newUserId);
    if (!newUser) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Validate role
    const validRoles = ['owner', 'collaborator', 'viewer'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check if already member
    const existing = await WorkspaceMember.findOne({
      where: {
        workspace_id: workspaceId,
        user_id: newUserId
      }
    });

    if (existing) {
      const error = new Error('User is already a member of this workspace');
      error.code = 'ALREADY_MEMBER';
      error.status = 400;
      throw error;
    }

    // Create or Recycle invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [invitation, created] = await WorkspaceInvitation.findOrCreate({
      where: {
        workspace_id: workspaceId,
        invitee_email: newUser.email
      },
      defaults: {
        inviter_id: currentUserId,
        invitee_id: newUserId,
        role,
        token,
        status: 'pending',
        expires_at: expiresAt
      }
    });

    if (!created) {
      // Recycle existing invitation
      await invitation.update({
        inviter_id: currentUserId,
        invitee_id: newUserId,
        role,
        token,
        status: 'pending',
        expires_at: expiresAt
      });
    }

    try {
      await notificationService.notifyWorkspaceInvitation(
        newUserId,
        workspaceId,
        currentUserId,
        `You have been invited to join workspace "${workspace.name}" as ${role}`,
        token
      );
    } catch (notifError) {
      logger.warn(`Failed to send invite notification: ${notifError.message}`);
    }

    logger.info(`Workspace invitation sent/recycled: workspace_id=${workspaceId}, to_user=${newUserId}, role=${role}`);

    return {
      message: created ? 'Invitation sent successfully' : 'Invitation updated and resent',
      invitation
    };
  }

  /**
   * Join a public workspace
   */
  async joinWorkspace(workspaceId, userId) {
    // Check workspace exists
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      const error = new Error('Workspace not found');
      error.code = 'WORKSPACE_NOT_FOUND';
      error.status = 404;
      throw error;
    }

    // Check if user is already a member
    const isMember = await this.isWorkspaceMember(workspaceId, userId);
    if (isMember) {
      // Return existing membership
      const existing = await WorkspaceMember.findOne({
        where: {
          workspace_id: workspaceId,
          user_id: userId
        }
      });
      return {
        id: existing.id,
        user_id: existing.user_id,
        role: existing.role,
        status: 'active',
        message: 'Already a member of this workspace'
      };
    }

    // For now, only allow join if workspace is public (check visibility field if it exists)
    // If no visibility field, allow join by default (backward compatible)
    const visibility = workspace.visibility || 'public';
    if (visibility === 'private') {
      const error = new Error('This workspace is private. You must be invited to join.');
      error.code = 'INVITE_REQUIRED';
      error.status = 403;
      throw error;
    }

    // Create membership with role 'member'
    const member = await WorkspaceMember.create({
      workspace_id: workspaceId,
      user_id: userId,
      role: 'member'
    });

    logger.info(`User joined workspace: workspace_id=${workspaceId}, user_id=${userId}`);

    return {
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      status: 'active'
    };
  }

  /**
   * Invite user to workspace
   */
  async inviteToWorkspace(workspaceId, inviterUserId, inviteeEmail, role = 'member', io = null) {
    // Validate workspace exists and inviter has permission
    const workspace = await Workspace.findByPk(workspaceId, {
      include: [
        {
          model: WorkspaceMember,
          as: 'members',
          where: { user_id: inviterUserId },
          required: false
        }
      ]
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    // Check if inviter is owner or collaborator
    const inviterMember = workspace.members.find(m => m.user_id === inviterUserId);
    const isOwner = workspace.owner_id === inviterUserId;
    const canInvite = isOwner || (inviterMember && ['owner', 'collaborator'].includes(inviterMember.role));

    if (!canInvite) {
      throw new Error('You do not have permission to invite members to this workspace');
    }

    // Check if user is already a member
    const existingMember = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId },
      include: [
        {
          model: User,
          as: 'user',
          where: { email: inviteeEmail }
        }
      ]
    });

    if (existingMember) {
      throw new Error('User is already a member of this workspace');
    }

    // Find invitee user if exists
    const inviteeUser = await User.findOne({ where: { email: inviteeEmail } });

    // Create or Recycle invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invitation, created] = await WorkspaceInvitation.findOrCreate({
      where: {
        workspace_id: workspaceId,
        invitee_email: inviteeEmail
      },
      defaults: {
        inviter_id: inviterUserId,
        invitee_id: inviteeUser?.id || null,
        role,
        token,
        status: 'pending',
        expires_at: expiresAt
      }
    });

    if (!created) {
      // Recycle existing invitation
      await invitation.update({
        inviter_id: inviterUserId,
        invitee_id: inviteeUser?.id || null,
        role,
        token,
        status: 'pending',
        expires_at: expiresAt
      });
    }

    // Send invitation email
    try {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
      const inviter = await User.findByPk(inviterUserId);

      await emailService.sendWorkspaceInvitation(
        inviteeEmail,
        inviter?.full_name || inviter?.username || 'A user',
        workspace.name,
        token,
        frontendUrl
      );

      logger.info(`[WorkspaceService] Sent invitation email to ${inviteeEmail} for workspace ${workspaceId}`);
    } catch (emailError) {
      logger.warn(`[WorkspaceService] Failed to send invitation email: ${emailError.message}`);
      // Don't throw - email is non-critical
    }
    // Create notification for invitee if user exists in system
    if (inviteeUser) {
      try {
        await notificationService.notifyWorkspaceInvitation(
          inviteeUser.id,
          workspaceId,
          inviterUserId,
          `You have been invited to join "${workspace.name}" as a ${role}. You can start participating in surveys with the team here.`,
          token
        );
      } catch (notifError) {
        logger.warn(`[WorkspaceService] Failed to create notification: ${notifError.message}`);
      }
    }

    // Log activity
    await this.logActivity(workspaceId, inviterUserId, 'member_invited', 'user', inviteeUser?.id, {
      invitee_email: inviteeEmail,
      role
    }, io);

    // Check for role mismatch warning (User invited as Collaborator/Owner but system role is 'user')
    if (inviteeUser && inviteeUser.role === 'user' && ['collaborator', 'owner'].includes(role)) {
      const warningMessage = `Cảnh báo: Người dùng ${inviteeUser.full_name || inviteeUser.username} hiện có vai trò hệ thống là User. Họ sẽ không thể thực hiện các quyền ${role === 'collaborator' ? 'Collaborator' : 'Owner'} (tạo Template/Survey) cho đến khi nâng cấp tài khoản lên Creator.`;
      
      await this.logActivity(workspaceId, inviterUserId, 'role_mismatch_warning', 'user', inviteeUser.id, {
        invitee_email: inviteeEmail,
        workspace_role: role,
        system_role: inviteeUser.role,
        warning: warningMessage,
        blocked_features: ['create_template', 'create_survey', 'create_workspace']
      }, io);

      logger.warn(`[WorkspaceService] Role mismatch: User ${inviteeUser.id} invited as ${role} but system role is ${inviteeUser.role}`);
    }

    return invitation;
  }

  /**
   * Accept workspace invitation
   */
  async acceptInvitation(token, userId, io = null) {
    const invitation = await WorkspaceInvitation.findOne({
      where: { token, status: 'pending' },
      include: [
        {
          model: Workspace,
          as: 'workspace'
        }
      ]
    });

    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    if (new Date() > invitation.expires_at) {
      await invitation.update({ status: 'expired' });
      throw new Error('Invitation has expired');
    }

    // Check if user is already a member
    const existingMember = await WorkspaceMember.findOne({
      where: {
        workspace_id: invitation.workspace_id,
        user_id: userId
      }
    });

    if (existingMember) {
      // User is already a member - just update invitation status and return workspace
      await invitation.update({
        status: 'accepted',
        invitee_id: userId
      });
      return invitation.workspace;
    }

    // Add user as member - use findOrCreate to handle race conditions
    // This ensures atomic operation: member creation happens before invitation update
    const [member, created] = await WorkspaceMember.findOrCreate({
      where: {
        workspace_id: invitation.workspace_id,
        user_id: userId
      },
      defaults: {
        role: invitation.role,
        is_active: true
      }
    });

    // Update invitation status - AFTER member is created (atomic sequence)
    await invitation.update({
      status: 'accepted',
      invitee_id: userId
    });

    // Emit real-time role_updated event for AuthContext refresh
    if (io && created) {
      try {
        io.to(`user_${userId}`).emit('role_updated', {
          userId: userId,
          workspaceId: invitation.workspace_id,
          newRole: invitation.role,
          action: 'workspace_joined'
        });
        logger.info(`📡 Emitted role_updated event for user ${userId} joining workspace ${invitation.workspace_id}`);
      } catch (socketError) {
        logger.warn(`⚠️ Failed to emit role_updated event: ${socketError.message}`);
        // Don't throw - real-time update is non-critical
      }
    }

    // Log activity only if member was newly created
    if (created) {
      await this.logActivity(invitation.workspace_id, userId, 'joined', 'workspace', invitation.workspace_id, {
        via_invitation: true,
        role: invitation.role
      }, io);
    }

    return invitation.workspace;
  }

  /**
   * Get workspace members
   */
  async getWorkspaceMembers(workspaceId, userId) {
    // Check access
    await this.getWorkspaceById(workspaceId, userId);

    const members = await WorkspaceMember.findAll({
      where: { workspace_id: workspaceId, is_active: true },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'full_name', 'role']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    return members;
  }

  /**
   * Get workspace activities
   */
  async getWorkspaceActivities(workspaceId, userId, limit = 20) {
    // Check access
    await this.getWorkspaceById(workspaceId, userId);
    return activityService.getActivities(workspaceId, limit);
  }

  /**
   * Update workspace (owner only)
   */
  async updateWorkspace(workspaceId, data, userId) {
    const { name, description, visibility } = data;

    // Validate inputs
    if (!workspaceId || !userId) {
      throw new Error('Workspace ID and User ID are required');
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Workspace name is required and must be a non-empty string');
    }

    if (name.trim().length > 100) {
      throw new Error('Workspace name must be 100 characters or less');
    }

    if (description && description.length > 500) {
      throw new Error('Workspace description must be 500 characters or less');
    }

    if (visibility && !['private', 'public'].includes(visibility)) {
      throw new Error('Workspace visibility must be either "private" or "public"');
    }

    // Find workspace and check ownership
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.owner_id !== userId) {
      throw new Error('Access denied. Only workspace owner can update workspace');
    }

    // Check if name is unique for this user (excluding current workspace)
    if (name && name !== workspace.name) {
      const existingWorkspace = await Workspace.findOne({
        where: {
          name,
          owner_id: userId,
          id: { [Op.ne]: workspaceId }
        }
      });

      if (existingWorkspace) {
        throw new Error('Workspace name already exists');
      }
    }

    // Store original values before update
    const previousValues = {
      name: workspace.name,
      description: workspace.description,
      visibility: workspace.visibility
    };

    const updatedValues = {
      name: name || workspace.name,
      description: description !== undefined ? description : workspace.description,
      visibility: visibility || workspace.visibility
    };

    // Update workspace
    await workspace.update(updatedValues);

    // Log activity (non-blocking)
    try {
      const metadataObj = {
        previous: previousValues,
        updated: updatedValues
      };

      await WorkspaceActivity.create({
        workspace_id: workspaceId,
        user_id: userId,
        action: 'workspace_updated',
        target_type: 'workspace',
        target_id: workspaceId,
        metadata: metadataObj
      });

      console.log('Activity logged with metadata:', JSON.stringify(metadataObj, null, 2));
    } catch (activityError) {
      // Log error but don't fail the main operation
      console.error('Failed to log workspace update activity:', activityError.message);
    }

    return workspace;
  }

  /**
   * Delete workspace (owner only)
   */
  async deleteWorkspace(workspaceId, userId) {
    // Validate inputs
    if (!workspaceId || !userId) {
      throw new Error('Workspace ID and User ID are required');
    }

    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.owner_id !== userId) {
      throw new Error('Access denied. Only workspace owner can delete workspace');
    }

    // Log activity before deletion (non-blocking)
    try {
      await WorkspaceActivity.create({
        workspace_id: workspaceId,
        user_id: userId,
        action: 'workspace_deleted',
        target_type: 'workspace',
        target_id: workspaceId,
        metadata: {
          workspace_name: workspace.name
        }
      });
    } catch (activityError) {
      // Log error but don't fail the main operation
      console.error('Failed to log workspace deletion activity:', activityError.message);
    }

    // Delete workspace (this will cascade to related records)
    await workspace.destroy();

    return true;
  }

  /**
   * Get pending invitations for a workspace (sent by owner/manager)
   */
  async getPendingInvitations(workspaceId, userId) {
    // Verify user is owner or has permission
    const workspace = await Workspace.findByPk(workspaceId);
    if (!workspace || workspace.owner_id !== userId) {
      throw new Error('Access denied. Only workspace owner can view invitations');
    }

    const invitations = await WorkspaceInvitation.findAll({
      where: {
        workspace_id: workspaceId,
        status: ['pending', 'expired'] // Include expired for reference
      },
      include: [
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return invitations.map(inv => ({
      id: inv.id,
      workspace_id: inv.workspace_id,
      invitee_email: inv.invitee_email,
      inviter: inv.inviter,
      role: inv.role,
      status: inv.status,
      token: inv.token,
      expires_at: inv.expires_at,
      created_at: inv.created_at,
      sent_at: inv.sent_at
    }));
  }

  /**
   * Get received invitations for current user
   */
  async getReceivedInvitations(userEmail) {
    const invitations = await WorkspaceInvitation.findAll({
      where: {
        invitee_email: userEmail,
        status: 'pending'
      },
      include: [
        {
          model: Workspace,
          as: 'workspace',
          attributes: ['id', 'name', 'description']
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return invitations.map(inv => ({
      id: inv.id,
      workspaceId: inv.workspace_id,
      workspace: inv.workspace,
      inviteeEmail: inv.invitee_email,
      inviter: inv.inviter,
      role: inv.role,
      status: inv.status,
      token: inv.token,
      expiresAt: inv.expires_at,
      createdAt: inv.created_at
    }));
  }

  /**
   * Cancel/revoke an invitation
   */
  async cancelInvitation(invitationId, userId) {
    const invitation = await WorkspaceInvitation.findByPk(invitationId, {
      include: [{ model: Workspace, as: 'workspace', attributes: ['owner_id'] }]
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify user is workspace owner
    if (invitation.workspace.owner_id !== userId) {
      throw new Error('Access denied. Only workspace owner can cancel invitations');
    }

    // Update invitation status
    await invitation.update({
      status: 'cancelled',
      updated_at: new Date()
    });

    // Log activity
    await this.logActivity(
      invitation.workspace_id,
      userId,
      'invitation_cancelled',
      'user',
      invitationId,
      { invitee_email: invitation.invitee_email }
    );

    return true;
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(invitationId, userId) {
    const invitation = await WorkspaceInvitation.findByPk(invitationId, {
      include: [
        { model: Workspace, as: 'workspace', attributes: ['id', 'name', 'owner_id'] },
        { model: User, as: 'inviter', attributes: ['id', 'username'] }
      ]
    });

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify user is workspace owner
    if (invitation.workspace.owner_id !== userId) {
      throw new Error('Access denied. Only workspace owner can resend invitations');
    }

    // Generate new token with extended expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await invitation.update({
      token: newToken,
      expires_at: expiresAt,
      sent_at: new Date(),
      status: 'pending'
    });

    // Send invitation email
    try {
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/workspace/invitation/${newToken}/accept`;

      await emailService.sendWorkspaceInvitation(
        invitation.invitee_email,
        invitation.inviter.username,
        invitation.workspace.name,
        newToken,
        process.env.FRONTEND_URL || 'http://localhost:3000'
      );
    } catch (emailError) {
      logger.warn(`Failed to send resend invitation email to ${invitation.invitee_email}:`, emailError.message);
      // Don't throw, allow invitation to be updated even if email fails
    }

    // Log activity
    await this.logActivity(
      invitation.workspace_id,
      userId,
      'invitation_resent',
      'user',
      invitationId,
      { invitee_email: invitation.invitee_email }
    );

    // Send notification to invitee if user exists in system
    try {
      const inviteeUser = await User.findOne({
        where: { email: invitation.invitee_email }
      });

      if (inviteeUser) {
        await notificationService.notifyWorkspaceInvitation(
          inviteeUser.id,
          invitation.workspace_id,
          userId,
          `Invitation to join "${invitation.workspace.name}" has been resent`,
          newToken
        );
        logger.info(`Notification sent to user ${inviteeUser.id} for resent invitation`);
      }
    } catch (notifError) {
      logger.warn(`Failed to send notification for resent invitation: ${notifError.message}`);
      // Don't throw - notification is non-critical
    }

    logger.info(`Invitation resent to ${invitation.invitee_email} for workspace ${invitation.workspace_id}`);

    return {
      id: invitation.id,
      token: newToken,
      expiresAt: expiresAt
    };
  }

  /**
   * Get invitation details by token
   */
  async getInvitationDetails(token) {
    const invitation = await WorkspaceInvitation.findOne({
      where: { token },
      include: [
        { model: Workspace, as: 'workspace', attributes: ['id', 'name', 'description'] },
        { model: User, as: 'inviter', attributes: ['id', 'username', 'email'] }
      ]
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    // Check if expired
    if (invitation.expires_at && new Date() > new Date(invitation.expires_at)) {
      throw new Error('Invitation has expired');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`Invitation is no longer valid (status: ${invitation.status})`);
    }

    return {
      id: invitation.id,
      workspace: invitation.workspace,
      inviter: invitation.inviter,
      role: invitation.role,
      email: invitation.invitee_email,
      token: invitation.token
    };
  }

  /**
   * Request a role change in a workspace
   */
  async requestRoleChange(workspaceId, userId, requestedRole, io = null) {
    const workspace = await Workspace.findByPk(workspaceId, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }]
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const requester = await User.findByPk(userId, { attributes: ['id', 'username', 'full_name'] });
    const requesterName = requester.full_name || requester.username;

    // Check if user is a member
    const membership = await WorkspaceMember.findOne({
      where: { workspace_id: workspaceId, user_id: userId }
    });

    if (!membership) {
      throw new Error('You are not a member of this workspace');
    }

    if (membership.role === 'owner') {
      throw new Error('You are already the owner of this workspace');
    }

    if (membership.role === requestedRole) {
      throw new Error(`You already have the role of ${requestedRole}`);
    }

    // Send notification to owner
    await notificationService.notifyRoleChangeRequest(
      workspace.owner_id,
      workspaceId,
      workspace.name,
      userId,
      requesterName,
      requestedRole,
      io
    );

    // Log activity
    await this.logActivity(workspaceId, userId, 'member_role_requested', 'user', userId, {
      requested_role: requestedRole
    }, io);

    return {
      ok: true,
      message: 'Promotion request sent to workspace owner'
    };
  }

  /**
   * Handle role change request (Approve/Decline)
   */
  async handleRoleChangeRequest(notificationId, action, ownerId, io = null) {
    const { Notification } = require('../../../models');
    const notification = await Notification.findByPk(notificationId);

    if (!notification || notification.user_id !== ownerId) {
      throw new Error('Notification not found or unauthorized');
    }

    if (notification.type !== 'role_change_request') {
      throw new Error('Invalid notification type');
    }

    const { requesting_user_id, requested_role, workspace_id } = notification.metadata;

    if (action === 'approve') {
      // Find the member
      const member = await WorkspaceMember.findOne({
        where: { workspace_id, user_id: requesting_user_id }
      });

      if (!member) {
        throw new Error('Requesting user is no longer a member of this workspace');
      }

      const oldRole = member.role;
      await member.update({ role: requested_role });

      // Log activity
      await this.logActivity(workspace_id, ownerId, 'member_role_updated', 'user', requesting_user_id, {
        old_role: oldRole,
        new_role: requested_role,
        via_request: true
      }, io); // Pass io

      // Notify user
      await notificationService.createNotification({
        user_id: requesting_user_id,
        type: 'workspace_member_added', // Use closest existing type or generic
        title: 'Promotion Approved',
        message: `Your request to be ${requested_role} in "${notification.message.match(/"([^"]+)"/)[1]}" has been approved.`,
        related_id: workspace_id,
        related_type: 'workspace',
        action_url: `/workspaces/${workspace_id}`
      }, io);

    } else {
      // Decline logic
      // Notify user
      await notificationService.createNotification({
        user_id: requesting_user_id,
        type: 'workspace_member_added',
        title: 'Promotion Declined',
        message: `Your request to be promoted in "${notification.message.match(/"([^"]+)"/)[1]}" has been declined.`,
        related_id: workspace_id,
        related_type: 'workspace'
      }, io);
    }

    // Mark request notification as read and archive/delete
    notification.is_read = true;
    notification.is_archived = true;
    await notification.save();

    return {
      ok: true,
      message: action === 'approve' ? 'Promotion approved successfully' : 'Promotion request declined'
    };
  }

  /**
   * Private helper to handle cleanup when a member leaves/is removed
   * @private
   */
  async _cleanupMemberExit(workspace, userId, io = null) {
    const workspaceId = workspace.id;
    const ownerId = workspace.owner_id;

    // 1. Asset Retention: Transfer survey ownership to Workspace Owner
    // Update all surveys in this workspace originally created by the exiting user
    await Survey.update(
      { created_by: ownerId },
      {
        where: {
          workspace_id: workspaceId,
          created_by: userId
        }
      }
    );

    // 2. Role Restoration: Check if user should still be a 'creator'
    // Logic: If they are no longer an owner of ANY workspace, downgrade to 'user'
    const ownedWorkspacesCount = await Workspace.count({ where: { owner_id: userId } });
    if (ownedWorkspacesCount === 0) {
      const user = await User.findByPk(userId);
      if (user && user.role === 'creator') {
        // Update role in database
        await user.update({ role: 'user' });
        logger.info(`✅ User ${userId} downgraded to 'user' role (no workspaces owned)`);

        // Emit role_updated event for immediate frontend context refresh
        if (io) {
          try {
            io.to(`user_${userId}`).emit('role_updated', {
              userId: userId,
              oldRole: 'creator',
              newRole: 'user',
              reason: 'no_workspaces_owned',
              action: 'workspace_exit'
            });
            logger.info(`📡 Emitted role_updated event: creator → user for user ${userId}`);
          } catch (socketError) {
            logger.warn(`⚠️ Failed to emit role_updated event: ${socketError.message}`);
          }
        }
      }
    }

    // 3. Socket Termination: Notify frontend for redirection
    if (io) {
      io.to(`user_${userId}`).emit('workspace:member_removed', {
        workspace_id: workspaceId,
        message: `You are no longer a member of "${workspace.name}"`
      });
      logger.info(`📡 Emitted workspace:member_removed to user:${userId}`);
    }
  }
}

module.exports = new WorkspaceService();





