// src/modules/surveys/service/survey.service.js
const { Survey, User, SurveyTemplate, SurveyResponse, Question, QuestionOption, SurveyAccess, SurveyInvite, Workspace, WorkspaceMember } = require('../../../models');
const { Op } = require('sequelize');
const surveyAccessService = require('./surveyAccess.service');
const activityService = require('../../workspaces/service/activity.service');
const notificationService = require('../../notifications/service/notification.service');

class SurveyService {
  /**
   * Helper to verify if user can manage (edit/delete/publish) a survey
   */
  async _checkManagementAccess(survey, user, action = 'manage') {
    if (user.role === 'admin') return true;

    let hasAccess = false;
    if (survey.workspace_id) {
      const membership = await WorkspaceMember.findOne({
        where: { workspace_id: survey.workspace_id, user_id: user.id }
      });
      if (membership && ['owner', 'collaborator'].includes(membership.role)) {
        hasAccess = true;
      }
    }

    if (survey.created_by === user.id) {
      hasAccess = true;
    }

    if (!hasAccess) {
      throw new Error(`Access denied. You do not have permission to ${action} this survey.`);
    }
    return true;
  }

  /**
   * Get all surveys with filters and pagination
   */
  /**
   * Get all surveys with filters and pagination
   */
  async getAllSurveys(options = {}, user) {
    const {
      page = 1,
      limit = 10,
      status,
      target_audience,
      search,
      source
    } = options;

    const offset = (page - 1) * limit;
    // Base where condition
    let where = {};

    // Role-based filtering
    if (user.role !== 'admin') {
      // 1. Get workspaces where user is Owner or Collaborator
      const manageMemberships = await WorkspaceMember.findAll({
        where: {
          user_id: user.id,
          role: { [Op.in]: ['owner', 'collaborator'] }
        },
        attributes: ['workspace_id']
      });
      const manageWorkspaceIds = manageMemberships.map(m => m.workspace_id);

      // 2. Allow if Created By User OR In Managed Workspace
      where = {
        [Op.or]: [
          { created_by: user.id },
          { workspace_id: { [Op.in]: manageWorkspaceIds } }
        ]
      };
    }

    // Source filter (Personal vs Workspace)
    if (source === 'personal') {
      where.workspace_id = null;
    } else if (source === 'workspace') {
      where.workspace_id = { [Op.ne]: null };
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Target audience filter
    if (target_audience) {
      where.target_audience = target_audience;
    }

    // Search filter
    if (search) {
      const searchCondition = {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ]
      };

      // Merge with existing where (which might be an OR already)
      where = {
        [Op.and]: [
          where,
          searchCondition
        ]
      };
    }

    const { sequelize } = require('../../../models'); // Ensure sequelize is available

    const { count, rows } = await Survey.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM survey_responses AS sr
              WHERE sr.survey_id = Survey.id
            )`),
            'responseCount'
          ],
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM survey_responses AS sr
              WHERE sr.survey_id = Survey.id
              AND sr.respondent_id = '${user.id}'
            )`),
            'my_response_count'
          ]
        ]
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: SurveyTemplate,
          as: 'template',
          attributes: ['id', 'title', 'description'],
          include: [
            {
              model: Question,
              as: 'Questions',
              attributes: ['id']
            }
          ]
        },
        {
          model: Workspace,
          as: 'workspace',
          attributes: ['id', 'name']
        }
      ],
      order: [['created_at', 'DESC']],
      distinct: true // Important for correct count with includes
    });

    // Map surveys to include questionCount (responseCount and my_response_count are already in attributes)
    const surveysWithCount = rows.map(survey => {
      const surveyData = survey.toJSON();
      const templateQuestions = surveyData.template?.Questions || [];
      surveyData.questionCount = templateQuestions.length;

      // Ensure counts are numbers (sequelize literals sometimes return strings)
      surveyData.responseCount = parseInt(survey.getDataValue('responseCount') || 0);
      surveyData.my_response_count = parseInt(survey.getDataValue('my_response_count') || 0);

      delete surveyData.SurveyResponses; // Clean up just in case
      return surveyData;
    });

    return {
      surveys: surveysWithCount,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get survey by ID with access control
   */
  async getSurveyById(surveyId, user) {
    const survey = await Survey.findByPk(surveyId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'full_name'],
          required: false
        },
        {
          model: SurveyTemplate,
          as: 'template',
          attributes: ['id', 'title'],
          required: false,
          include: [
            {
              model: Question,
              as: 'Questions',
              attributes: ['id', 'question_text', 'question_type_id', 'display_order', 'required', 'label'],
              required: false,
              include: [
                {
                  model: QuestionOption,
                  as: 'QuestionOptions',
                  attributes: ['id', 'option_text', 'display_order'],
                  required: false
                }
              ]
            }
          ]
        },
        {
          model: Workspace,
          as: 'workspace',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!survey) {
      throw new Error('Survey not found'); // 404
    }

    // Admin bypass
    if (user.role === 'admin') {
      return survey;
    }

    // Visibility Waterfall Logic
    const isCreator = survey.created_by === user.id;
    let isWorkspaceManager = false;
    let isWorkspaceMember = false;

    if (survey.workspace_id) {
      const membership = await WorkspaceMember.findOne({
        where: { workspace_id: survey.workspace_id, user_id: user.id }
      });
      if (membership) {
        isWorkspaceMember = true;
        if (['owner', 'collaborator'].includes(membership.role)) {
          isWorkspaceManager = true;
        }
      }
    }

    // 1. DRAFT Status
    if (survey.status === 'draft') {
      // Only Creator or Workspace Manager (Owner/Collaborator)
      if (isCreator || isWorkspaceManager) {
        return survey;
      }
      // If just a member or outsider -> Deny
      // Per requirement: Member gets 403/404. Let's throw Access Denied which becomes 403.
      throw new Error('Access denied. Draft surveys are only visible to owners and collaborators.');
    }

    // 2. ACTIVE/CLOSED/ARCHIVED Status

    // Creator and Managers always have access
    if (isCreator || isWorkspaceManager) {
      return survey;
    }

    // Check Access Type for others
    if (survey.access_type === 'internal') {
      // Must be at least a member
      if (!isWorkspaceMember) {
        throw new Error('Access denied. This is an internal workspace survey.');
      }
      // If member, they can view (Execute view)
      return survey;
    }

    // Public / Public Login / Invited
    // Use existing service check for individual grants or generic access
    const hasAccess = await surveyAccessService.hasAccess(surveyId, user.id, 'view');
    if (!hasAccess) {
      // One last check: if public? hasAccess usually handles public logic if implemented there
      // But let's check manually if service doesn't cover "Public" explicitly without login (though usually we require login here as 'user' is passed)
      if (survey.access_type === 'public' || survey.access_type === 'public_login') {
        return survey;
      }
      throw new Error('Access denied to this survey');
    }

    return survey;
  }

  /**
   * Create new survey
   */
  async createSurvey(surveyData, user, io = null) {
    const {
      template_id,
      title,
      description,
      start_date,
      end_date,
      target_audience,
      target_value,
      // Simple Access Control fields
      access_type = 'public',
      require_login = false,
      allow_anonymous = true,
      workspace_id = null
    } = surveyData;

    // Verify template exists
    const template = await SurveyTemplate.findByPk(template_id);
    if (!template) {
      throw new Error('Survey template not found');
    }

    // Verify user profile (role: user) cannot create personal surveys
    if (user.role === 'user' && !workspace_id) {
      throw new Error('Users cannot create personal surveys. Join a workspace to create surveys.');
    }

    // Validate workspace access if provided
    if (workspace_id) {
      const workspace = await Workspace.findByPk(workspace_id);
      if (!workspace) {
        throw new Error('Workspace not found');
      }

      // Admin bypasses membership check
      if (user.role !== 'admin') {
        const membership = await WorkspaceMember.findOne({
          where: { workspace_id, user_id: user.id }
        });

        if (!membership) {
          throw new Error('Access denied. You are not a member of this workspace.');
        }

        // Enhanced logic: Allow Users with Collaborator+ workspace role ("borrowed powers")
        const canCreate = (
          (user.role === 'creator' && ['owner', 'collaborator'].includes(membership.role)) ||
          (user.role === 'user' && ['owner', 'collaborator'].includes(membership.role)) // 🆕 Borrowed powers
        );

        if (!canCreate) {
          throw new Error('Access denied. Only workspace owners and collaborators can create surveys.');
        }
      }
    }

    const survey = await Survey.create({
      template_id,
      title,
      description,
      start_date,
      end_date,
      target_audience: target_audience || 'all_users',
      target_value,
      created_by: user.id,
      status: 'draft',
      // Simple Access Control
      access_type,
      require_login,
      allow_anonymous,
      workspace_id: workspace_id
    });

    // Log activity if workspace survey
    if (workspace_id) {
      await activityService.logActivity({
        workspaceId: workspace_id,
        userId: user.id,
        action: 'survey_created',
        targetType: 'survey',
        targetId: survey.id,
        metadata: { title: survey.title },
        io
      });

      // Send notifications to workspace members (role-based filtering)
      try {
        await notificationService.notifyWorkspaceMembers({
          workspaceId: workspace_id,
          type: 'survey_created',
          title: 'New Survey Created',
          message: `${user.username} created a new survey "${survey.title}"`,
          actionUrl: `/creator/surveys/${survey.id}/edit`, // Take managers to edit page
          actorId: user.id,
          relatedSurveyId: survey.id,
          excludeUserIds: [user.id], // Don't notify the creator
          priority: 'normal',
          category: 'survey',
          surveyStatus: 'draft' // Only notify managers for draft surveys
        });
      } catch (notificationError) {
        console.error('Failed to send notifications for new survey:', notificationError);
      }
    }

    return this.getSurveyById(survey.id, user);
  }

  /**
   * Update survey
   */
  async updateSurvey(surveyId, updateData, user, io = null) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check ownership or workspace permission
    await this._checkManagementAccess(survey, user, 'edit');

    // Store old status before update
    const oldStatus = survey.status;

    // Update allowed fields
    const allowedFields = [
      'title',
      'description',
      'start_date',
      'end_date',
      'target_audience',
      'target_value',
      'status',
      // Simple Access Control
      'access_type',
      'require_login',
      'allow_anonymous',
      'workspace_id'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        survey[field] = updateData[field];
      }
    });

    await survey.save();
    
    // Log activity if workspace survey
    if (survey.workspace_id) {
      await activityService.logActivity({
        workspaceId: survey.workspace_id,
        userId: user.id,
        action: 'survey_updated',
        targetType: 'survey',
        targetId: surveyId,
        metadata: { title: survey.title },
        io
      });

      // Send notifications for important status changes
      const statusChanges = {
        'draft': 'Survey moved to draft',
        'active': 'Survey published and is now active',
        'paused': 'Survey has been paused',
        'closed': 'Survey has been closed',
        'archived': 'Survey has been archived'
      };

      if (updateData.status && oldStatus !== updateData.status) {
        try {
          // Determine action URL based on status and user role
          let actionUrl = `/creator/surveys/${surveyId}/edit`; // Default for managers
          if (updateData.status === 'active') {
            actionUrl = `/surveys/${surveyId}`; // Active surveys: direct to survey page for participation
          }
          
          await notificationService.notifyWorkspaceMembers({
            workspaceId: survey.workspace_id,
            type: `survey_${updateData.status}`,
            title: `Survey Status Changed`,
            message: `${user.username} updated survey "${survey.title}": ${statusChanges[updateData.status] || 'Status updated'}`,
            actionUrl: actionUrl,
            actorId: user.id,
            relatedSurveyId: surveyId,
            excludeUserIds: [user.id],
            priority: updateData.status === 'active' ? 'high' : 'normal',
            category: 'survey',
            surveyStatus: updateData.status // Role filtering based on new status
          });
        } catch (notificationError) {
          console.error('Failed to send status change notifications:', notificationError);
        }
      } else if (!updateData.status) {
        // General update notification (not status change)
        try {
          await notificationService.notifyWorkspaceMembers({
            workspaceId: survey.workspace_id,
            type: 'survey_updated',
            title: 'Survey Updated',
            message: `${user.username} updated survey "${survey.title}"`,
            actionUrl: `/creator/surveys/${surveyId}/edit`, // Take to edit page for changes
            actorId: user.id,
            relatedSurveyId: surveyId,
            excludeUserIds: [user.id],
            priority: 'normal',
            category: 'survey',
            surveyStatus: survey.status || 'draft' // Use current status for filtering
          });
        } catch (notificationError) {
          console.error('Failed to send update notifications:', notificationError);
        }
      }
    }

    return this.getSurveyById(surveyId, user);
  }

  /**
   * Delete survey
   */
  async deleteSurvey(surveyId, user) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check ownership or workspace permission
    await this._checkManagementAccess(survey, user, 'delete');

    // Manual Cascade Delete for Notifications to prevent FK error
    const { Notification, SurveyInvite, SurveyCollector } = require('../../../models');

    // 1. Delete Notifications directly related to survey
    await Notification.destroy({ where: { related_survey_id: surveyId } });

    // 2. Delete Survey Invites (might be cascade, but safe to do manually)
    await SurveyInvite.destroy({ where: { survey_id: surveyId } });

    // 3. Delete Notifications related to Collectors of this survey
    // (If collectors are not auto-cascaded, they block survey delete. 
    // If they ARE auto-cascaded, their derived notifications might block THEM)
    const collectors = await SurveyCollector.findAll({
      where: { survey_id: surveyId },
      attributes: ['id']
    });
    if (collectors.length > 0) {
      const collectorIds = collectors.map(c => c.id);
      // Delete notifications for these collectors? Not typical but possible 'collector_created'
      // Delete responses first if needed? SurveyResponse usually cascades on Survey deletion, 
      // but if Notification -> SurveyResponse exists, we might need to clear those notifications too.
      // But typically Survey delete -> Response delete. 
    }

    // Log activity and send notification BEFORE deletion
    if (survey.workspace_id) {
      await activityService.logActivity({
        workspaceId: survey.workspace_id,
        userId: user.id,
        action: 'survey_deleted',
        targetType: 'survey',
        targetId: surveyId,
        metadata: { title: survey.title },
        io
      });

      // Send deletion notification
      try {
        await notificationService.notifyWorkspaceMembers({
          workspaceId: survey.workspace_id,
          type: 'survey_deleted',
          title: 'Survey Deleted',
          message: `${user.username} deleted survey "${survey.title}"`,
          actionUrl: `/creator/workspaces/${survey.workspace_id}`, // Take to workspace management page
          actorId: user.id,
          relatedSurveyId: surveyId,
          excludeUserIds: [user.id],
          priority: 'normal',
          category: 'survey',
          surveyStatus: 'deleted' // Only managers need to know about deletions
        });
      } catch (notificationError) {
        console.error('Failed to send deletion notifications:', notificationError);
      }
    }

    // Force delete survey
    await survey.destroy();

    return { message: 'Survey deleted successfully' };
  }

  /**
   * Bulk delete surveys
   */
  async deleteSurveys(surveyIds, user) {
    if (!Array.isArray(surveyIds) || surveyIds.length === 0) {
      throw new Error('No survey IDs provided');
    }

    const where = {
      id: { [Op.in]: surveyIds }
    };

    // If not admin, restrict to own or managed workspace surveys
    if (user.role !== 'admin') {
      const memberships = await WorkspaceMember.findAll({
        where: { user_id: user.id, role: { [Op.in]: ['owner', 'collaborator'] } },
        attributes: ['workspace_id']
      });
      const workspaceIds = memberships.map(m => m.workspace_id);

      where[Op.or] = [
        { created_by: user.id },
        { workspace_id: { [Op.in]: workspaceIds } }
      ];
    }

    const count = await Survey.count({ where });

    if (count === 0) {
      throw new Error('No surveys found or access denied');
    }

    const { Notification, SurveyInvite } = require('../../../models');

    // Manual cleanup for bulk delete
    await Notification.destroy({ where: { related_survey_id: { [Op.in]: surveyIds } } });
    await SurveyInvite.destroy({ where: { survey_id: { [Op.in]: surveyIds } } });

    await Survey.destroy({ where });

    return { message: `${count} surveys deleted successfully` };
  }

  /**
   * Get survey statistics
   */
  async getSurveyStats(surveyId, user) {
    const survey = await this.getSurveyById(surveyId, user);

    if (!survey) {
      throw new Error('Survey not found');
    }

    const responseCount = await SurveyResponse.count({
      where: { survey_id: surveyId }
    });

    return {
      survey_id: surveyId,
      title: survey.title,
      status: survey.status,
      response_count: responseCount,
      start_date: survey.start_date,
      end_date: survey.end_date,
      target_audience: survey.target_audience
    };
  }

  /**
   * Publish survey (change status from draft to active)
   */
  async publishSurvey(surveyId, user) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check ownership or workspace permission
    await this._checkManagementAccess(survey, user, 'publish');

    // Validate status transition
    if (survey.status !== 'draft') {
      throw new Error(`Cannot publish survey. Current status: ${survey.status}. Only draft surveys can be published.`);
    }

    // Validate dates
    const now = new Date();
    const startDate = new Date(survey.start_date);
    const endDate = new Date(survey.end_date);

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    if (endDate <= now) {
      throw new Error('End date must be in the future');
    }

    // Update status to active
    survey.status = 'active';
    await survey.save();

    return this.getSurveyById(surveyId, user);
  }

  /**
   * Close survey (change status from active to closed)
   */
  async closeSurvey(surveyId, user) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check ownership or workspace permission
    await this._checkManagementAccess(survey, user, 'close');

    // Validate status transition
    if (survey.status !== 'active') {
      throw new Error(`Cannot close survey. Current status: ${survey.status}. Only active surveys can be closed.`);
    }

    // Update status to closed
    survey.status = 'closed';
    await survey.save();

    return this.getSurveyById(surveyId, user);
  }

  /**
   * Update survey status (flexible status change with validation)
   */
  async updateSurveyStatus(surveyId, newStatus, user) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check ownership or workspace permission
    await this._checkManagementAccess(survey, user, 'update the status of');

    const validStatuses = ['draft', 'active', 'closed', 'analyzed', 'archived'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Valid statuses: ${validStatuses.join(', ')}`);
    }

    // Validate status transitions
    const currentStatus = survey.status;

    // Define valid transitions
    const validTransitions = {
      draft: ['active', 'archived'],
      active: ['closed', 'archived'], // Active can be closed or archived
      closed: ['analyzed', 'active', 'archived'], // Closed can be re-opened or archived
      analyzed: ['archived'], // Analyzed can be archived
      archived: ['active'] // Archived can only be Restored (Active)
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}. Valid next states: ${validTransitions[currentStatus].join(', ') || 'none'}`);
    }

    // Update status
    survey.status = newStatus;
    await survey.save();

    return this.getSurveyById(surveyId, user);
  }

  /**
   * Restore archived survey
   */
  async restoreSurvey(surveyId, user) {
    const survey = await Survey.findByPk(surveyId);

    if (!survey) {
      throw new Error('Survey not found');
    }

    // Check ownership or workspace permission
    await this._checkManagementAccess(survey, user, 'restore');

    // Validate status
    if (survey.status !== 'archived') {
      throw new Error(`Cannot restore survey. Current status: ${survey.status}. Only archived surveys can be restored.`);
    }

    // Update status to active
    survey.status = 'active';
    await survey.save();

    // Log activity if workspace survey
    if (survey.workspace_id) {
      await activityService.logActivity({
        workspaceId: survey.workspace_id,
        userId: user.id,
        action: 'survey_restored',
        targetType: 'survey',
        targetId: surveyId,
        metadata: { title: survey.title },
        io: null
      });

      // Send restoration notification
      try {
        await notificationService.notifyWorkspaceMembers({
          workspaceId: survey.workspace_id,
          type: 'survey_active',
          title: 'Survey Restored',
          message: `${user.username} restored survey "${survey.title}" and it's now active`,
          actionUrl: `/surveys/${surveyId}`, // Active survey: direct to participation page
          actorId: user.id,
          relatedSurveyId: surveyId,
          excludeUserIds: [user.id],
          priority: 'high', // High priority since it's now active
          category: 'survey',
          surveyStatus: 'active' // Active status: notify all roles including members
        });
      } catch (notificationError) {
        console.error('Failed to send restoration notifications:', notificationError);
      }
    }

    return this.getSurveyById(surveyId, user);
  }

  /**
   * Auto-close expired surveys (for cron job)
   */
  async autoCloseExpiredSurveys() {
    const now = new Date();

    // Find all active surveys past their end_date
    const expiredSurveys = await Survey.findAll({
      where: {
        status: 'active',
        end_date: { [Op.lt]: now }
      }
    });

    // Close each expired survey
    const results = [];
    for (const survey of expiredSurveys) {
      survey.status = 'closed';
      await survey.save();
      results.push({
        survey_id: survey.id,
        title: survey.title,
        closed_at: new Date()
      });
    }

    return {
      closed_count: results.length,
      surveys: results
    };
  }
  /**
   * Get surveys assigned to the user (Pending / Completed)
   */
  async getAssignedSurveys(userId, userEmail, status = 'pending', options = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    // 1. Get Workspace IDs where user is a member (excluding Viewers for assigned survey discovery)
    const memberships = await WorkspaceMember.findAll({
      where: {
        user_id: userId,
        role: { [Op.not]: 'viewer' }
      },
      attributes: ['workspace_id']
    });
    const workspaceIds = memberships.map(m => m.workspace_id);

    // 2. Get Survey IDs where user is invited by email
    const invites = await SurveyInvite.findAll({
      where: { email: userEmail },
      attributes: ['survey_id']
    });
    const invitedSurveyIds = invites.map(i => i.survey_id);

    // 3. Get Survey IDs where user has responded
    const userResponses = await SurveyResponse.findAll({
      where: { respondent_id: userId },
      attributes: ['survey_id']
    });
    const respondedSurveyIds = userResponses.map(r => r.survey_id);

    // 4. Construct Query
    let whereCondition = {
      status: 'active', // Only show active surveys
      [Op.or]: [
        // Internal surveys in user's workspaces
        {
          access_type: 'internal',
          workspace_id: { [Op.in]: workspaceIds }
        },
        // Private surveys where user is invited
        {
          id: { [Op.in]: invitedSurveyIds }
        },
        // Public surveys requiring login
        {
          access_type: 'public_login'
        }
      ]
    };

    // Filter by Pending / Completed
    if (status === 'completed') {
      whereCondition.id = { [Op.in]: respondedSurveyIds };
    } else {
      // Pending: Not responding OR (Responded but survey allows multiple? No, usually 'Assigned' assumes one-off)
      // For now, simple logic: Pending = Not in responded list
      whereCondition.id = { ...whereCondition.id, [Op.notIn]: respondedSurveyIds };

      // Make sure we merge if there was already an ID condition (e.g. from invitedSurveyIds)
      // Wait, invitedSurveyIds is in OR, so it's not a top-level AND.
      // But [Op.notIn] needs to be top-level AND with the main condition.

      // Let's refine logical structure.
      // Base: (Groups OR Invites OR Public) AND (Status Active) AND (Not Responded)
    }

    // Combine with Search
    if (search) {
      whereCondition = {
        [Op.and]: [
          whereCondition,
          {
            [Op.or]: [
              { title: { [Op.like]: `%${search}%` } },
              { description: { [Op.like]: `%${search}%` } }
            ]
          }
        ]
      };
    }

    const { count, rows } = await Survey.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: Workspace,
          as: 'workspace',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['end_date', 'ASC']] // Sort by due date (soonest first)
    });

    return {
      surveys: rows.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        status: s.status,
        start_date: s.start_date,
        end_date: s.end_date,
        workspace: s.workspace ? { name: s.workspace.name } : null,
        creator: s.creator ? { name: s.creator.full_name } : null,
        is_overdue: s.end_date && new Date(s.end_date) < new Date(),
        access_type: s.access_type
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  }
  /**
   * Validate if AI generation is allowed for this survey
   */
  async validateAiGeneration(surveyId) {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.status !== 'draft') {
      throw new Error(`AI generation not allowed. Survey status is ${survey.status}, must be 'draft'.`);
    }

    // Also check response count just in case status is draft but has dirty data? 
    // Usually status is source of truth.
    return true;
  }

  /**
   * Validate if AI analysis is allowed for this survey
   */
  async validateAiAnalysis(surveyId) {
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.status !== 'closed') {
      // User requirement: "Chặn analysis nếu khảo sát chưa ở trạng thái closed."
      // Optionally allow 'active' if explicitly requested later, but for now strict.
      throw new Error(`AI analysis not allowed. Survey status is ${survey.status}, must be 'closed'.`);
    }

    const responseCount = await SurveyResponse.count({ where: { survey_id: surveyId } });
    if (responseCount === 0) {
      throw new Error('Cannot analyze survey with no responses.');
    }

    return true;
  }
}

module.exports = new SurveyService();
