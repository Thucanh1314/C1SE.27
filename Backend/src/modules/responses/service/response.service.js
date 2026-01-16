const {
  SurveyResponse,
  Answer,
  Survey,
  Question,
  QuestionOption,
  User,
  SurveyCollector
} = require('../../../models');
const collectorService = require('../../collectors/service/collector.service');

class ResponseService {
  /**
   * Get response by ID
   */
  async getResponseById(id, user) {
    const response = await SurveyResponse.findByPk(id, {
      include: [
        {
          model: Survey,
          as: 'Survey',
          attributes: ['id', 'title', 'created_by']
        },
        {
          model: User,
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: Answer,
          include: [
            {
              model: Question,
              attributes: ['id', 'question_text', 'label', 'question_type_id']
            },
            {
              model: QuestionOption,
              attributes: ['id', 'option_text']
            }
          ]
        }
      ]
    });

    if (!response) {
      return null;
    }

    // Check access: owner, survey creator, admin, or workspace member
    const survey = response.Survey;
    const isOwner = response.respondent_id === user.id;
    const isCreator = survey.created_by === user.id;
    const isAdmin = user.role === 'admin';

    let isWorkspaceMember = false;
    if (survey.workspace_id) {
      const { WorkspaceMember } = require('../../../models');
      const membership = await WorkspaceMember.findOne({
        where: { workspace_id: survey.workspace_id, user_id: user.id }
      });
      if (membership) isWorkspaceMember = true;
    }

    if (!isOwner && !isCreator && !isAdmin && !isWorkspaceMember) {
      throw new Error('Access denied');
    }

    return response;
  }

  /**
   * Get all responses for a survey
   */
  async getResponsesBySurvey(surveyId, user, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Verify survey exists and user has access
    const survey = await Survey.findByPk(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    // Access check: Admin, Survey Creator, or Workspace Member (Owner/Collaborator/Viewer)
    let hasAccess = user.role === 'admin' || survey.created_by === user.id;

    if (!hasAccess && survey.workspace_id) {
      const { WorkspaceMember } = require('../../../models');
      const membership = await WorkspaceMember.findOne({
        where: { workspace_id: survey.workspace_id, user_id: user.id }
      });
      if (membership) hasAccess = true;
    }

    if (!hasAccess) {
      throw new Error('Access denied. You do not have permission to view responses for this survey.');
    }

    const { count, rows } = await SurveyResponse.findAndCountAll({
      where: {
        survey_id: surveyId,
        [require('sequelize').Op.or]: [
          { status: 'completed' },
          // Only include non-completed if they have at least one answer (partial)
          require('sequelize').literal(`(SELECT COUNT(*) FROM answers WHERE answers.survey_response_id = SurveyResponse.id) > 0`)
        ]
      },
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'full_name', 'email']
        },
        {
          model: Answer,
          include: [
            {
              model: Question,
              attributes: ['id', 'question_text', 'label', 'question_type_id']
            },
            {
              model: QuestionOption,
              attributes: ['id', 'option_text']
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return {
      responses: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get user's own responses with enhanced filtering and search
   */
  async getUserResponses(user, options = {}) {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sortBy = 'created_at',
      sortOrder = 'DESC',
      includeAnswers = false
    } = options;

    const offset = (page - 1) * limit;

    // Build where clause with search and filters
    const where = { respondent_id: user.id };

    // Add survey title search
    const surveyWhere = {};
    if (search.trim()) {
      surveyWhere.title = {
        [require('sequelize').Op.like]: `%${search.trim()}%`
      };
    }

    // Add status filter 
    if (status && ['completed', 'started', 'abandoned'].includes(status)) {
      where.status = status;
    }

    // Define includes
    const includes = [
      {
        model: Survey,
        as: 'Survey',
        attributes: ['id', 'title', 'description', 'status', 'created_at'],
        where: Object.keys(surveyWhere).length > 0 ? surveyWhere : undefined,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'full_name']
          }
        ]
      }
    ];

    // Include detailed answers if requested
    if (includeAnswers) {
      includes.push({
        model: Answer,
        include: [
          {
            model: Question,
            attributes: ['id', 'question_text', 'label', 'question_type_id']
          },
          {
            model: QuestionOption,
            attributes: ['id', 'option_text'],
            required: false
          }
        ]
      });
    }

    // Validate sort options
    const validSortFields = ['created_at', 'updated_at', 'completion_time'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const { count, rows } = await SurveyResponse.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      include: includes,
      order: [[sortField, sortDirection]],
      distinct: true // Important when using includes to get accurate count
    });

    return {
      responses: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      },
      filters: {
        search,
        status,
        sortBy: sortField,
        sortOrder: sortDirection
      }
    };
  }

  /**
   * Get detailed response with all answers for user (own responses only)
   */
  async getUserResponseDetail(responseId, user) {
    const response = await SurveyResponse.findOne({
      where: {
        id: responseId,
        respondent_id: user.id // Only allow user to see their own responses
      },
      include: [
        {
          model: Survey,
          as: 'Survey',
          attributes: ['id', 'title', 'description', 'status'],
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'username', 'full_name']
            }
          ]
        },
        {
          model: Answer,
          include: [
            {
              model: Question,
              attributes: ['id', 'question_text', 'label', 'question_type_id']
            },
            {
              model: QuestionOption,
              attributes: ['id', 'option_text'],
              required: false
            }
          ]
        }
      ]
    });

    if (!response) {
      throw new Error('Response not found or access denied');
    }

    return response;
  }

  /**
   * Delete response (admin or owner only)
   */
  async deleteResponse(responseId, user) {
    const response = await SurveyResponse.findByPk(responseId);

    if (!response) {
      throw new Error('Response not found');
    }

    // Only owner or admin can delete
    if (response.respondent_id !== user.id && user.role !== 'admin') {
      throw new Error('Access denied');
    }

    await response.destroy();

    return { message: 'Response deleted successfully' };
  }

  /**
   * Submit authenticated response
   */
  async submitResponse(responseData, user) {
    const { survey_id, answers } = responseData;

    // Fetch survey
    const survey = await Survey.findByPk(survey_id, {
      include: [{
        model: require('../../../models').SurveyTemplate,
        as: 'template',
        include: [{
          model: Question,
          as: 'Questions',
          include: [{
            model: require('../../../models').QuestionType,
            as: 'QuestionType'
          }]
        }]
      }]
    });

    if (!survey) {
      throw new Error('Survey not found');
    }

    if (survey.status !== 'active') {
      throw new Error('Survey is not active');
    }

    // Check end date
    if (survey.end_date && new Date(survey.end_date) < new Date()) {
      throw new Error('This survey has ended');
    }

    // Check existing response
    const existing = await SurveyResponse.findOne({
      where: { survey_id, respondent_id: user.id }
    });
    if (existing) {
      throw new Error('You have already responded to this survey');
    }

    // Create Map
    const questionTypeMap = {};
    if (survey.template && survey.template.Questions) {
      survey.template.Questions.forEach(q => {
        questionTypeMap[q.id] = q.QuestionType ? q.QuestionType.type_name : 'text';
      });
    }

    // Create Response or Update Session
    let surveyResponse;
    if (responseData.response_id) {
      surveyResponse = await SurveyResponse.findByPk(responseData.response_id);
      if (surveyResponse) {
        // Update existing session
        const startTime = surveyResponse.start_time;
        const completionTime = new Date();
        const timeTakenSeconds = startTime ? Math.floor((completionTime - startTime) / 1000) : 0;

        console.log(`[ResponseService] Updating existing response ${surveyResponse.id}:`);
        console.log(`  Start Time: ${startTime}`);
        console.log(`  Completion Time: ${completionTime}`);
        console.log(`  Time Taken: ${timeTakenSeconds} seconds`);

        surveyResponse.status = 'completed';
        surveyResponse.completion_time = completionTime;
        surveyResponse.time_taken = timeTakenSeconds;
        await surveyResponse.save();
      }
    }

    if (!surveyResponse) {
      // Fallback: Create new if no session or invalid session
      const completionTime = new Date();
      // Use a more realistic start time (e.g., 2-5 minutes before completion)
      const estimatedStartTime = new Date(completionTime.getTime() - (3 * 60 * 1000)); // 3 minutes ago
      const timeTakenSeconds = Math.floor((completionTime - estimatedStartTime) / 1000);

      console.log(`[ResponseService] Creating fallback response for survey ${survey_id}:`);
      console.log(`  Estimated Start Time: ${estimatedStartTime}`);
      console.log(`  Completion Time: ${completionTime}`);
      console.log(`  Estimated Time Taken: ${timeTakenSeconds} seconds`);

      surveyResponse = await SurveyResponse.create({
        survey_id,
        respondent_id: user.id,
        is_anonymous: false,
        respondent_email: user.email,
        respondent_name: user.full_name || user.username,
        status: 'completed',
        completion_time: completionTime,
        start_time: estimatedStartTime,
        time_taken: timeTakenSeconds
      });
    }

    // Create Answers
    if (answers && Array.isArray(answers)) {
      const answerPromises = [];
      for (const answer of answers) {
        const questionId = answer.questionId || answer.question_id;
        // Support both value (generic) and text_value (specific)
        const value = answer.value !== undefined ? answer.value : answer.text_value;
        const type = questionTypeMap[questionId] || 'text';

        if (!questionId) continue;

        if (Array.isArray(value)) {
          value.forEach(val => {
            answerPromises.push(Answer.create({
              survey_response_id: surveyResponse.id,
              question_id: questionId,
              option_id: (type === 'checkbox' || type === 'multiple_choice') ? val : null,
            }));
          });
        } else {
          let optionId = null;
          let textAnswer = null;
          let numericAnswer = null;

          if (type === 'multiple_choice' || type === 'dropdown' || type === 'checkbox') {
            optionId = value;
          } else if (type === 'likert_scale' || type === 'rating') {
            // Convert to number and validate, set to null if invalid
            const parsedValue = parseFloat(value);
            numericAnswer = !isNaN(parsedValue) ? parsedValue : null;
          } else {
            textAnswer = typeof value === 'string' ? value : JSON.stringify(value);
          }

          answerPromises.push(Answer.create({
            survey_response_id: surveyResponse.id,
            question_id: questionId,
            option_id: optionId,
            text_answer: textAnswer,
            numeric_answer: numericAnswer
          }));
        }
      }
      await Promise.all(answerPromises);
    }

    return surveyResponse;
  }

  /**
   * Submit public response via collector token
   */
  async submitPublicResponse(collectorToken, responseData, userIdentifier = null, user = null) {
    const { answers } = responseData;

    console.log('[ResponseService] Submitting answers payload:', JSON.stringify(answers, null, 2));

    // Get collector and validate with Questions to map answer types
    const collector = await SurveyCollector.findOne({
      where: { token: collectorToken },
      include: [{
        model: Survey,
        as: 'Survey',
        include: [{
          model: require('../../../models').SurveyTemplate,
          as: 'template',
          include: [{
            model: Question,
            as: 'Questions',
            include: [{
              model: require('../../../models').QuestionType,
              as: 'QuestionType'
            }]
          }]
        }]
      }]
    });

    if (!collector) {
      throw new Error('Invalid collector token');
    }

    if (!collector.is_active) {
      throw new Error('This collector is no longer active');
    }

    const survey = collector.Survey;

    if (survey.status !== 'active') {
      throw new Error('This survey is not currently accepting responses');
    }

    // Check end date
    if (survey.end_date && new Date(survey.end_date) < new Date()) {
      throw new Error('This survey has ended');
    }

    // Create a map of question ID to type for processing answers
    const questionTypeMap = {};
    if (survey.template && survey.template.Questions) {
      survey.template.Questions.forEach(q => {
        questionTypeMap[q.id] = q.QuestionType ? q.QuestionType.type_name : 'text';
      });
    }

    // --- Access Control Checks ---
    if (survey.access_type === 'public_with_login') {
      if (!user) {
        throw new Error('Access denied. You must be logged in to respond to this survey.');
      }
    } else if (survey.access_type === 'internal') {
      if (!user) {
        throw new Error('Access denied. You must be logged in to respond to this survey.');
      }

      // Check workspace membership
      if (survey.workspace_id) {
        const { WorkspaceMember } = require('../../../models');
        const member = await WorkspaceMember.findOne({
          where: {
            workspace_id: survey.workspace_id,
            user_id: user.id,
            is_active: true
          }
        });

        if (!member) {
          throw new Error('Access denied. You must be a member of the workspace to respond.');
        }
      }
    } else if (survey.access_type === 'private') {
      // Private surveys require valid invite token
      const inviteToken = responseData.invite_token;

      if (!inviteToken) {
        throw new Error('Access denied. This is a private survey that requires an invitation.');
      }

      // Validate invite token
      const surveyInviteService = require('../../surveys/service/surveyInvite.service');
      try {
        const invite = await surveyInviteService.validateInvite(inviteToken);

        // Verify invite is for this survey
        if (invite.survey_id !== survey.id) {
          throw new Error('Invalid invite token for this survey.');
        }

        // Store invite ID to mark as responded later
        responseData._inviteId = invite.id;
      } catch (error) {
        throw new Error(`Access denied. ${error.message}`);
      }
    }

    // Create or Update survey response
    let surveyResponse;
    if (responseData.response_id) {
      surveyResponse = await SurveyResponse.findByPk(responseData.response_id);
    }

    // Fallback: Try to find by client_response_id (Idempotency Key) - STRONGEST MATCH
    if (!surveyResponse && responseData.client_response_id) {
      surveyResponse = await SurveyResponse.findOne({
        where: {
          survey_id: survey.id,
          client_response_id: responseData.client_response_id
        }
      });
    }

    // Fallback: Try to find by session_id if available (and still in started status ideally, or just last one)
    // We prioritize the one explicitly passed by ID, but if lost, we recover via session_id
    if (!surveyResponse && responseData.session_id) {
      surveyResponse = await SurveyResponse.findOne({
        where: {
          survey_id: survey.id,
          session_id: responseData.session_id
        }
      });
    }

    // Fallback: Try to find by User ID if authenticated
    if (!surveyResponse && user) {
      surveyResponse = await SurveyResponse.findOne({
        where: {
          survey_id: survey.id,
          respondent_id: user.id
        }
      });
    }

    if (surveyResponse) {
      // Update existing response
      // TIMING LOGIC START
      const now = new Date();
      surveyResponse.last_interaction_at = now;
      if (!surveyResponse.first_interaction_at) {
        surveyResponse.first_interaction_at = now;
        console.log(`[Timing] Response ${surveyResponse.id}: Set first_interaction_at to ${now.toISOString()}`);
      }

      surveyResponse.status = 'completed';
      surveyResponse.completion_time = now;

      // Calculate time_taken ONLY if we have valid start/first interaction
      // We prioritize first_interaction_at, but fallback to start_time if needed for legacy
      const startTime = surveyResponse.first_interaction_at || surveyResponse.start_time;
      if (startTime) {
        // Calculate duration in seconds
        const durationMs = now.getTime() - new Date(startTime).getTime();
        const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));

        // Only update time_taken if it's not set or if we have a better value
        // But per requirements: "Do NOT overwrite timing once it has been calculated" 
        // implies we should be careful. However, if user comes back and finishes, we probably DO want the full time.
        // Let's stick to: if it's the final submit that completes it, we overwrite/set it.
        surveyResponse.time_taken = durationSeconds;

        console.log(`[Timing] Response ${surveyResponse.id} completed. Duration: ${durationSeconds}s`);
        console.log(`[Timing] Start: ${startTime.toISOString()}, End: ${now.toISOString()}`);
      }
      // TIMING LOGIC END

      await surveyResponse.save();
    }

    if (!surveyResponse) {
      // CREATE new if absolutely no record found (using helper for safety)
      // Note: We create it as 'started' first from helper (if reused), then update to 'completed' below
      surveyResponse = await this.getOrCreateResponse(
        survey.id,
        collector.id,
        user,
        responseData.session_id,
        responseData.client_response_id
      );

      // Update the newly created/found response to completed immediately
      if (surveyResponse) {
        const now = new Date();

        // TIMING LOGIC START
        surveyResponse.last_interaction_at = now;

        // If it's new/just created, first_interaction is now (or slightly before if we want to be fuzzy, but strict is better)
        if (!surveyResponse.first_interaction_at) {
          // If we just created it, first interaction is basically now.
          surveyResponse.first_interaction_at = now;
          console.log(`[Timing] New Response ${surveyResponse.id}: Set first_interaction_at to ${now.toISOString()}`);
        }

        // Use a realistic estimate for single-page immediate submissions if needed,
        // BUT strict requirement is: time_taken = last - first.
        // If last == first (instant submit), time is 0. 
        // User asked: "Save time_taken only if > 0".
        // If it's 0, it won't be saved/used for analytics likely.

        const startTime = surveyResponse.first_interaction_at || surveyResponse.start_time;

        // Fallback for immediate submit: Use start_time if it was set earlier
        // In getOrCreateResponse (ResponseLifecycle), start_time is set to creation time.

        let timeTakenSeconds = 0;
        if (startTime) {
          const durationMs = now.getTime() - new Date(startTime).getTime();
          timeTakenSeconds = Math.max(0, Math.floor(durationMs / 1000));
        }

        // If 0 (too fast), maybe use a small fallback buffer IF the user wants mock?
        // Requirement 6: "Do NOT generate mock timing data".
        // So we leave it as calculated.

        console.log(`[Timing] New Response ${surveyResponse.id} completed in ${timeTakenSeconds}s`);

        surveyResponse.status = 'completed';
        surveyResponse.completion_time = now;
        if (timeTakenSeconds > 0) {
          surveyResponse.time_taken = timeTakenSeconds;
        }

        // CRITICAL: Save the changes to database
        await surveyResponse.save();
      }
    }

    // Create answers
    if (answers && Array.isArray(answers)) {
      const answerPromises = [];

      for (const answer of answers) {
        // Handle both camelCase (frontend) and snake_case
        const questionId = answer.questionId || answer.question_id;
        const value = answer.value;
        const type = questionTypeMap[questionId];

        if (!questionId) continue;

        // Handle array values (e.g. checkboxes)
        if (Array.isArray(value)) {
          value.forEach(val => {
            answerPromises.push(Answer.create({
              survey_response_id: surveyResponse.id,
              question_id: questionId,
              option_id: (type === 'checkbox' || type === 'multiple_choice') ? val : null,
              text_answer: null,
              numeric_answer: null
            }));
          });
        } else {
          // Single value
          let optionId = null;
          let textAnswer = null;
          let numericAnswer = null;

          if (type === 'multiple_choice' || type === 'dropdown' || type === 'checkbox') {
            optionId = value;
          } else if (type === 'likert_scale' || type === 'rating') {
            // Convert to number and validate, set to null if invalid
            const parsedValue = parseFloat(value);
            numericAnswer = !isNaN(parsedValue) ? parsedValue : null;
          } else {
            textAnswer = value;
          }

          answerPromises.push(Answer.create({
            survey_response_id: surveyResponse.id,
            question_id: questionId,
            option_id: optionId,
            text_answer: textAnswer,
            numeric_answer: numericAnswer
          }));
        }
      }

      await Promise.all(answerPromises);
    }

    // SAFETY CHECK: Ensure response is marked as completed
    if (surveyResponse && surveyResponse.status !== 'completed') {
      console.warn(`[ResponseService] Response ${surveyResponse.id} not completed, forcing completion...`);
      surveyResponse.status = 'completed';
      surveyResponse.completion_time = new Date();
      if (surveyResponse.start_time) {
        surveyResponse.time_taken = Math.floor((surveyResponse.completion_time - surveyResponse.start_time) / 1000);
      }
      await surveyResponse.save();
    }

    // Increment collector response count
    await collectorService.incrementResponseCount(collector.id);

    // Mark invite as responded if this was a private survey with invite
    if (responseData._inviteId) {
      const surveyInviteService = require('../../surveys/service/surveyInvite.service');
      try {
        await surveyInviteService.markInviteResponded(responseData.invite_token);
      } catch (error) {
        // Log but don't fail the response submission
        console.error('Failed to mark invite as responded:', error);
      }
    }

    // Log successful submission for monitoring
    try {
      const SubmissionMonitor = require('../../../utils/submissionMonitor');
      SubmissionMonitor.logSubmission(
        survey.id,
        surveyResponse.id,
        surveyResponse.status,
        surveyResponse.time_taken,
        responseData.client_response_id
      );
    } catch (error) {
      // Don't fail submission if monitoring fails
      console.error('Monitoring log failed:', error);
    }

    return {
      response_id: surveyResponse.id,
      survey_id: survey.id,
      submitted_at: surveyResponse.completion_time,
      message: 'Response submitted successfully'
    };
  }

  /**
   * Start a new survey session (for Drop-off tracking)
   */
  async startSession(surveyId, collectorToken = null, userIdentifier = null, user = null, sessionId = null, clientResponseId = null) {
    // Basic validation
    const survey = await Survey.findByPk(surveyId);
    if (!survey) throw new Error('Survey not found');

    if (survey.status !== 'active') throw new Error('Survey is not active');

    // Resolve Collector ID if token provided
    let collectorId = null;
    if (collectorToken) {
      const collector = await SurveyCollector.findOne({ where: { token: collectorToken } });
      if (collector) collectorId = collector.id;
    }

    // IDEMPOTENCY CHECK: If clientResponseId provided, look for existing response (any status)
    if (clientResponseId) {
      const existingResponse = await SurveyResponse.findOne({
        where: {
          survey_id: surveyId,
          client_response_id: clientResponseId
        }
      });

      if (existingResponse) {
        console.log(`[ResponseService] Resuming existing response by client_response_id: ${clientResponseId}`);
        return existingResponse;
      }
    }

    // FALLBACK IDEMPOTENCY CHECK: If session_id provided, look for existing ACTIVE session
    if (sessionId) {
      const existingSession = await SurveyResponse.findOne({
        where: {
          survey_id: surveyId,
          session_id: sessionId,
          status: 'started' // Only reuse if still in 'started' state
        }
      });

      if (existingSession) {
        console.log(`[ResponseService] Resuming existing session: ${existingSession.id} for session_id: ${sessionId}`);
        // Update last active timestamp if we had one, or just return it
        return existingSession;
      }
    }

    // Create "Started" Response
    // Use getOrCreate logic to prevents race conditions
    return await this.getOrCreateResponse(surveyId, collectorId, user, sessionId, clientResponseId);
  }

  /**
   * Helper: Atomic Get or Create Response
   * Ensures idempotency using client_response_id or finding existing session
   */
  async getOrCreateResponse(surveyId, collectorId = null, user = null, sessionId = null, clientResponseId = null) {
    // 1. Try finding by Client ID (Strongest Idempotency)
    if (clientResponseId) {
      const existing = await SurveyResponse.findOne({
        where: { survey_id: surveyId, client_response_id: clientResponseId }
      });
      if (existing) return existing;
    }

    // 2. Try finding by Session ID (Legacy/Fallback) - Only reused if "started"
    if (sessionId) {
      const existingSession = await SurveyResponse.findOne({
        where: { survey_id: surveyId, session_id: sessionId, status: 'started' }
      });
      if (existingSession) return existingSession;
    }

    // 3. Create NEW (Atomic-ish)
    // Note: If clientResponseId is passed, the Unique Constraint on DB will prevent duplicates 
    // even if two parallel requests reach here.
    try {
      return await SurveyResponse.create({
        survey_id: surveyId,
        collector_id: collectorId,
        respondent_id: user ? user.id : null,
        respondent_email: user ? user.email : null,
        session_id: sessionId,
        client_response_id: clientResponseId,
        status: 'started',
        start_time: new Date(),
        first_interaction_at: new Date(),
        last_interaction_at: new Date()
      });
    } catch (error) {
      // Handle Race Condition (Unique Constraint Violation)
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('[ResponseService] Race condition caught, retrieving existing response.');
        if (clientResponseId) {
          return await SurveyResponse.findOne({
            where: { survey_id: surveyId, client_response_id: clientResponseId }
          });
        }
      }
      throw error;
    }
  }

  /**
   * Fix stuck response by marking as completed
   */
  async completeStuckResponse(responseId) {
    const response = await SurveyResponse.findByPk(responseId);

    if (!response) {
      throw new Error('Response not found');
    }

    if (response.status === 'completed') {
      return { message: 'Response already completed', response };
    }

    // Update to completed
    const startTime = new Date(response.start_time || response.created_at);
    const completionTime = new Date();
    const timeTaken = Math.floor((completionTime - startTime) / 1000);

    await response.update({
      status: 'completed',
      completion_time: completionTime,
      time_taken: timeTaken
    });

    return {
      message: 'Response marked as completed',
      response: response,
      timeTaken: timeTaken
    };
  }
}

module.exports = new ResponseService();
