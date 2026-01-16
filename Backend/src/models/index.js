// src/models/index.js
const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Import models
const User = require('./user.model')(sequelize, DataTypes);
const SurveyTemplate = require('./surveyTemplate.model')(sequelize, DataTypes);
const QuestionType = require('./questionType.model')(sequelize, DataTypes);
const Question = require('./question.model')(sequelize, DataTypes);
const QuestionOption = require('./questionOption.model')(sequelize, DataTypes);
const Survey = require('./survey.model')(sequelize, DataTypes);
const SurveyCollector = require('./surveyCollector.model')(sequelize, DataTypes);
const SurveyResponse = require('./surveyResponse.model')(sequelize, DataTypes);
const SurveyInvite = require('./surveyInvite.model')(sequelize, DataTypes);
const Answer = require('./answer.model')(sequelize, DataTypes);
const AnalysisResult = require('./analysisResult.model')(sequelize, DataTypes);
const Visualization = require('./visualization.model')(sequelize, DataTypes);
const Notification = require('./notification.model')(sequelize, DataTypes);
const Workspace = require('./workspace.model')(sequelize, DataTypes);
const WorkspaceMember = require('./workspaceMember.model')(sequelize, DataTypes);
const WorkspaceUser = require('./workspaceUser.model')(sequelize, DataTypes);
const WorkspaceInvitation = require('./workspaceInvitation.model')(sequelize, DataTypes);
const WorkspaceActivity = require('./workspaceActivity.model')(sequelize, DataTypes);
const ChatConversation = require('./chatConversation.model')(sequelize, DataTypes);
const ChatMessage = require('./chatMessage.model')(sequelize, DataTypes);
const SurveyAccess = require('./surveyAccess.model')(sequelize, DataTypes);
const SystemSetting = require('./systemSetting.model')(sequelize, DataTypes);
const GeneratedQuestion = require('./generatedQuestion.model')(sequelize, DataTypes);
const SurveyFeedback = require('./surveyFeedback.model')(sequelize, DataTypes);
const CreatorUpgradeRequest = require('./creatorUpgradeRequest.model')(sequelize, DataTypes);

// Define associations
User.hasMany(SurveyTemplate, { foreignKey: 'created_by' });
SurveyTemplate.belongsTo(User, { foreignKey: 'created_by' });

// ... (existing associations) ...

// Creator Upgrade Request Associations
User.hasMany(CreatorUpgradeRequest, { foreignKey: 'user_id', as: 'upgradeRequests' });
CreatorUpgradeRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(CreatorUpgradeRequest, { foreignKey: 'reviewed_by', as: 'reviewedUpgradeRequests' });
CreatorUpgradeRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

module.exports = {
  sequelize,
  User,
  // ... (other exports) ...
  CreatorUpgradeRequest,
  SurveyFeedback
};

SurveyTemplate.hasMany(Question, { foreignKey: 'template_id', as: 'Questions' });
Question.belongsTo(SurveyTemplate, { foreignKey: 'template_id', as: 'template' });

QuestionType.hasMany(Question, { foreignKey: 'question_type_id' });
Question.belongsTo(QuestionType, { foreignKey: 'question_type_id', as: 'QuestionType' });

Question.hasMany(QuestionOption, { foreignKey: 'question_id', as: 'QuestionOptions' });
QuestionOption.belongsTo(Question, { foreignKey: 'question_id' });

SurveyTemplate.hasMany(Survey, { foreignKey: 'template_id', as: 'surveys' });
Survey.belongsTo(SurveyTemplate, { foreignKey: 'template_id', as: 'template' });

// Survey can have Questions directly (not just through template)
// This allows quality.service.js to fetch questions for a survey
Survey.hasMany(Question, { foreignKey: 'template_id', sourceKey: 'template_id', as: 'Questions' });

User.hasMany(Survey, { foreignKey: 'created_by', as: 'surveys' });
Survey.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

Survey.hasMany(SurveyResponse, { foreignKey: 'survey_id' });
SurveyResponse.belongsTo(Survey, { foreignKey: 'survey_id' });

User.hasMany(SurveyResponse, { foreignKey: 'respondent_id' });
SurveyResponse.belongsTo(User, { foreignKey: 'respondent_id' });

SurveyResponse.hasMany(Answer, { foreignKey: 'survey_response_id' });
Answer.belongsTo(SurveyResponse, { foreignKey: 'survey_response_id' });

Question.hasMany(Answer, { foreignKey: 'question_id' });
Answer.belongsTo(Question, { foreignKey: 'question_id' });

QuestionOption.hasMany(Answer, { foreignKey: 'option_id' });
Answer.belongsTo(QuestionOption, { foreignKey: 'option_id' });

Survey.hasMany(AnalysisResult, { foreignKey: 'survey_id' });
AnalysisResult.belongsTo(Survey, { foreignKey: 'survey_id' });

Survey.hasMany(Visualization, { foreignKey: 'survey_id' });
Visualization.belongsTo(Survey, { foreignKey: 'survey_id' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// SurveyCollector associations
Survey.hasMany(SurveyCollector, { foreignKey: 'survey_id', as: 'Collectors' });
SurveyCollector.belongsTo(Survey, { foreignKey: 'survey_id', as: 'Survey' });

User.hasMany(SurveyCollector, { foreignKey: 'created_by' });
SurveyCollector.belongsTo(User, { foreignKey: 'created_by' });

SurveyCollector.hasMany(SurveyResponse, { foreignKey: 'collector_id' });
SurveyResponse.belongsTo(SurveyCollector, { foreignKey: 'collector_id' });

// Workspace associations
User.hasMany(Workspace, { foreignKey: 'owner_id', as: 'ownedWorkspaces' });
Workspace.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });

Workspace.hasMany(WorkspaceMember, { foreignKey: 'workspace_id', as: 'members' });
WorkspaceMember.belongsTo(Workspace, { foreignKey: 'workspace_id' });

User.hasMany(WorkspaceMember, { foreignKey: 'user_id' });
WorkspaceMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Workspace.hasMany(WorkspaceInvitation, { foreignKey: 'workspace_id', as: 'invitations' });
WorkspaceInvitation.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

User.hasMany(WorkspaceInvitation, { foreignKey: 'inviter_id', as: 'sentInvitations' });
WorkspaceInvitation.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });

Workspace.hasMany(WorkspaceActivity, { foreignKey: 'workspace_id', as: 'activities' });
WorkspaceActivity.belongsTo(Workspace, { foreignKey: 'workspace_id' });

User.hasMany(WorkspaceActivity, { foreignKey: 'user_id' });
WorkspaceActivity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// WorkspaceUser associations (new access control model)
Workspace.hasMany(WorkspaceUser, { foreignKey: 'workspace_id', as: 'workspaceUsers' });
WorkspaceUser.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

User.hasMany(WorkspaceUser, { foreignKey: 'user_id', as: 'workspaceUsers' });
WorkspaceUser.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Workspace.hasMany(Survey, { foreignKey: 'workspace_id', as: 'surveys' });
Survey.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

// Chat associations
User.hasMany(ChatConversation, { foreignKey: 'user_id', as: 'chatConversations' });
ChatConversation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

ChatConversation.hasMany(ChatMessage, { foreignKey: 'conversation_id', as: 'messages' });
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversation_id', as: 'conversation' });

// Survey Access associations (simplified)
Survey.hasMany(SurveyInvite, { foreignKey: 'survey_id', as: 'invites' });
SurveyInvite.belongsTo(Survey, { foreignKey: 'survey_id', as: 'survey' });

User.hasMany(SurveyInvite, { foreignKey: 'created_by', as: 'sentInvites' });
SurveyInvite.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Survey Access associations (old system)
Survey.hasMany(SurveyAccess, { foreignKey: 'survey_id', as: 'accessGrants' });
SurveyAccess.belongsTo(Survey, { foreignKey: 'survey_id', as: 'survey' });

User.hasMany(SurveyAccess, { foreignKey: 'user_id', as: 'surveyAccess' });
SurveyAccess.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Feedback Associations
Survey.hasMany(SurveyFeedback, { foreignKey: 'survey_id', as: 'feedbacks' });
SurveyFeedback.belongsTo(Survey, { foreignKey: 'survey_id', as: 'survey' });

SurveyResponse.hasOne(SurveyFeedback, { foreignKey: 'response_id', as: 'feedback' });
SurveyFeedback.belongsTo(SurveyResponse, { foreignKey: 'response_id', as: 'response' });

User.hasMany(SurveyAccess, { foreignKey: 'granted_by', as: 'grantedAccess' });
SurveyAccess.belongsTo(User, { foreignKey: 'granted_by', as: 'grantor' });

module.exports = {
  sequelize,
  User,
  SurveyTemplate,
  QuestionType,
  Question,
  QuestionOption,
  Survey,
  SurveyCollector,
  SurveyResponse,
  SurveyInvite,
  Answer,
  AnalysisResult,
  Visualization,
  Notification,
  Workspace,
  WorkspaceMember,
  WorkspaceUser,
  WorkspaceInvitation,
  WorkspaceActivity,
  ChatConversation,
  ChatMessage,
  SurveyAccess,
  SystemSetting,
  GeneratedQuestion,
  SurveyFeedback,
  CreatorUpgradeRequest
};
