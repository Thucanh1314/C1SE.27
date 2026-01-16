/**
 * Permission Check Controller
 * Provides endpoints for frontend to check user permissions
 */

const logger = require('../../../utils/logger');

class PermissionController {
    /**
     * Get user's comprehensive permissions
     * Combines System Role and Workspace Role
     */
    async getUserPermissions(req, res) {
        try {
            const user = req.user;
            const workspaceId = req.params.workspaceId || req.query.workspaceId;

            // Check for role mismatch
            let roleMismatch = null;
            if (req.workspaceMember && user.role === 'user' && ['collaborator', 'owner'].includes(req.workspaceMember.role)) {
                roleMismatch = {
                    hasRoleMismatch: true,
                    systemRole: user.role,
                    workspaceRole: req.workspaceMember.role,
                    warning: `Bạn đang là thành viên của Workspace này với vai trò ${req.workspaceMember.role === 'collaborator' ? 'Collaborator' : 'Owner'}, nhưng bạn cần nâng cấp lên Creator để sử dụng các tính năng thiết kế và AI (tạo Template/Survey).`,
                    blockedFeatures: ['create_template', 'create_survey', 'create_workspace'],
                    recommendedAction: 'upgrade_to_creator'
                };
            }

            const permissions = {
                systemRole: user.role,
                isCreator: user.role === 'creator',
                roleMismatch,
                permissions: {
                    // Workspace permissions
                    canCreateWorkspace: user.role === 'creator',
                    canManageWorkspace: user.role === 'creator',
                    
                    // Template permissions
                    canCreateTemplate: user.role === 'creator',
                    canEditTemplate: user.role === 'creator',
                    canDeleteTemplate: user.role === 'creator',
                    canViewTemplates: true, // Everyone can view
                    
                    // Survey permissions
                    canCreateSurvey: user.role === 'creator',
                    canEditSurvey: user.role === 'creator',
                    canDeleteSurvey: user.role === 'creator',
                    canPublishSurvey: user.role === 'creator',
                    canViewSurveys: true, // Everyone can view
                    
                    // AI permissions
                    canUseAI: user.role === 'creator',
                    canGenerateQuestions: user.role === 'creator',
                    canUseAdvancedAI: user.role === 'creator',
                    
                    // Analytics permissions
                    canViewAnalytics: true, // Everyone can view
                    canRequestAIAnalysis: user.role === 'creator'
                }
            };

            // If workspace ID is provided, add workspace-specific permissions
            if (workspaceId && req.workspaceMember) {
                permissions.workspaceRole = req.workspaceMember.role;
                permissions.permissions.isWorkspaceOwner = req.workspaceMember.role === 'owner';
                permissions.permissions.isWorkspaceCollaborator = req.workspaceMember.role === 'collaborator';
                permissions.permissions.isWorkspaceViewer = req.workspaceMember.role === 'viewer';
                
                // Workspace-specific overrides
                if (req.workspaceMember.role === 'viewer') {
                    // Viewers can only view, not modify
                    permissions.permissions.canEditSurvey = false;
                    permissions.permissions.canDeleteSurvey = false;
                    permissions.permissions.canPublishSurvey = false;
                }
            }

            return res.status(200).json({
                success: true,
                data: permissions
            });
        } catch (error) {
            logger.error('Error getting user permissions:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get user permissions',
                error: error.message
            });
        }
    }

    /**
     * Check specific permission
     */
    async checkPermission(req, res) {
        try {
            const user = req.user;
            const { feature, action } = req.body;

            let hasPermission = false;
            let reason = null;

            // Define permission rules
            const permissionRules = {
                workspace: {
                    create: user.role === 'creator',
                    manage: user.role === 'creator'
                },
                template: {
                    create: user.role === 'creator',
                    edit: user.role === 'creator',
                    delete: user.role === 'creator',
                    view: true
                },
                survey: {
                    create: user.role === 'creator',
                    edit: user.role === 'creator',
                    delete: user.role === 'creator',
                    publish: user.role === 'creator',
                    view: true
                },
                ai: {
                    use: user.role === 'creator',
                    generate: user.role === 'creator',
                    analyze: user.role === 'creator'
                },
                analytics: {
                    view: true,
                    request: user.role === 'creator'
                }
            };

            // Check permission
            if (permissionRules[feature] && permissionRules[feature][action] !== undefined) {
                hasPermission = permissionRules[feature][action];
                
                if (!hasPermission) {
                    reason = user.role !== 'creator' ? 'CREATOR_ROLE_REQUIRED' : 'INSUFFICIENT_PERMISSIONS';
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid feature or action',
                    feature,
                    action
                });
            }

            return res.status(200).json({
                success: true,
                hasPermission,
                reason,
                userRole: user.role,
                feature,
                action
            });
        } catch (error) {
            logger.error('Error checking permission:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to check permission',
                error: error.message
            });
        }
    }

    /**
     * Get UI visibility configuration for user
     * Tells frontend which UI elements to show/hide
     */
    async getUIConfig(req, res) {
        try {
            const user = req.user;
            const workspaceRole = req.workspaceMember?.role || null;

            // Check for role mismatch
            const hasRoleMismatch = user.role === 'user' && ['collaborator', 'owner'].includes(workspaceRole);

            const uiConfig = {
                sidebar: {
                    showCreateWorkspace: user.role === 'creator',
                    showTemplates: true,
                    showSurveys: true,
                    showAIFeatures: user.role === 'creator' || hasRoleMismatch, // Show but may be locked
                    showAnalytics: true,
                    workspaceMenusEnabled: user.role === 'creator'
                },
                buttons: {
                    createTemplate: {
                        visible: true,
                        enabled: user.role === 'creator',
                        tooltip: user.role !== 'creator' ? 'Vui lòng nâng cấp lên Creator' : null,
                        showLockIcon: hasRoleMismatch,
                        showUpgradeModal: hasRoleMismatch
                    },
                    createSurvey: {
                        visible: true,
                        enabled: user.role === 'creator',
                        tooltip: user.role !== 'creator' ? 'Vui lòng nâng cấp lên Creator' : null,
                        showLockIcon: hasRoleMismatch,
                        showUpgradeModal: hasRoleMismatch
                    },
                    useAI: {
                        visible: true,
                        enabled: user.role === 'creator',
                        tooltip: user.role !== 'creator' ? 'Chỉ Creator mới có thể sử dụng AI' : null,
                        showLockIcon: user.role !== 'creator',
                        showUpgradeModal: hasRoleMismatch
                    },
                    requestAnalysis: {
                        visible: true,
                        enabled: user.role === 'creator',
                        tooltip: user.role !== 'creator' ? 'Yêu cầu nâng cấp để sử dụng tính năng AI Analytics' : null,
                        showUpgradeModal: hasRoleMismatch
                    }
                },
                features: {
                    ai: {
                        enabled: user.role === 'creator',
                        showUpgradePrompt: user.role !== 'creator'
                    },
                    templates: {
                        canCreate: user.role === 'creator',
                        canView: true,
                        canEdit: user.role === 'creator'
                    },
                    surveys: {
                        canCreate: user.role === 'creator',
                        canView: true,
                        canEdit: user.role === 'creator'
                    },
                    analytics: {
                        canView: true,
                        canRequestNew: user.role === 'creator',
                        limitedView: workspaceRole === 'viewer'
                    }
                },
                messages: {
                    upgradePrompt: user.role !== 'creator' ? 
                        'Nâng cấp lên Creator để mở khóa đầy đủ tính năng AI và quản lý' : null,
                    viewerNote: workspaceRole === 'viewer' ? 
                        'Bạn đang ở chế độ xem. Liên hệ Owner để được cấp quyền cao hơn.' : null,
                    roleMismatchWarning: hasRoleMismatch ?
                        `Bạn đang là thành viên của Workspace này với vai trò ${workspaceRole === 'collaborator' ? 'Collaborator' : 'Owner'}, nhưng bạn cần nâng cấp lên Creator để sử dụng các tính năng thiết kế và AI (tạo Template/Survey).` : null
                }
            };

            return res.status(200).json({
                success: true,
                data: uiConfig
            });
        } catch (error) {
            logger.error('Error getting UI config:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get UI configuration',
                error: error.message
            });
        }
    }

    /**
     * Get upgrade requirement info
     */
    async getUpgradeInfo(req, res) {
        try {
            const user = req.user;

            const upgradeInfo = {
                currentRole: user.role,
                needsUpgrade: user.role !== 'creator',
                targetRole: 'creator',
                blockedFeatures: user.role !== 'creator' ? [
                    {
                        feature: 'Workspace Management',
                        reason: 'Không thể tạo thêm Workspace mới'
                    },
                    {
                        feature: 'Template Creation',
                        reason: 'Cần System Role là creator để tạo template'
                    },
                    {
                        feature: 'Survey Creation',
                        reason: 'Không thể tạo khảo sát mới'
                    },
                    {
                        feature: 'AI Features',
                        reason: 'Truy cập AI (cổng 8001) bị từ chối'
                    },
                    {
                        feature: 'Advanced Analytics',
                        reason: 'Yêu cầu AI phân tích dữ liệu mới đòi hỏi quyền creator'
                    }
                ] : [],
                benefits: [
                    'Tạo và quản lý Workspace không giới hạn',
                    'Thiết kế Template khảo sát tùy chỉnh',
                    'Sử dụng đầy đủ tính năng AI (Port 8001 & Gemini)',
                    'Phân tích dữ liệu nâng cao với AI',
                    'Quản lý toàn diện Survey và Response'
                ]
            };

            return res.status(200).json({
                success: true,
                data: upgradeInfo
            });
        } catch (error) {
            logger.error('Error getting upgrade info:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get upgrade information',
                error: error.message
            });
        }
    }
}

module.exports = new PermissionController();
