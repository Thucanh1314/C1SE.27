import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkspaceService from '../../../api/services/workspace.service';
import CollectorService from '../../../api/services/collector.service';
import { useToast } from '../../../contexts/ToastContext';
import Loader from '../../../components/common/Loader/Loader';
import Modal from '../../../components/common/Modal/Modal';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import styles from './WorkspaceDetail.module.scss';
import {
  LuLayoutDashboard,
  LuUsers,
  LuFileText,
  LuActivity,
  LuSettings,
  LuTrash2,
  LuLogOut,
  LuUserPlus,
  LuClipboardList,
  LuGlobe,
  LuLock,
  LuPencil,
  LuPlay,
  LuChartBar,
  LuFilePlus,
  LuCircleArrowUp,
  LuBrain,
  LuUser,
  LuFilePen
} from 'react-icons/lu';
import socketService from '../../../api/services/socket.service';
import SurveyService from '../../../api/services/survey.service';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationTriggers } from '../../../components/Notifications';
import UpgradeModal from '../../../components/UpgradeToCreator/UpgradeModal';
import UpgradeUpsellModal from '../../../components/UI/UpgradeUpsellModal/UpgradeUpsellModal';
import InvitationWarningModal from '../../../components/UI/InvitationWarningModal/InvitationWarningModal';
import Button from '../../../components/UI/Button';
import UserService from '../../../api/services/user.service';

const WorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth(); // Get current user
  const notificationTriggers = useNotificationTriggers();

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    // Read initial tab from URL hash or default to 'overview'
    const hash = window.location.hash.replace('#', '');
    return ['overview', 'members', 'surveys', 'activities'].includes(hash) ? hash : 'overview';
  });

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member'
  });
  const [inviting, setInviting] = useState(false);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    visibility: 'workspace_members'
  });
  const [updating, setUpdating] = useState(false);

  // Delete survey modal
  const [showDeleteSurveyModal, setShowDeleteSurveyModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);

  // Handle tab change with URL hash update
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    window.location.hash = tabName;
  };

  // Listen for hash changes to sync tab state
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['overview', 'members', 'surveys', 'activities'].includes(hash)) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Remove member confirmation
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);

  // Leave workspace confirmation
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Upgrade & Upsell Modals
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Invitation warning
  const [showInviteWarning, setShowInviteWarning] = useState(false);
  const [pendingInvitation, setPendingInvitation] = useState(null);

  const handleDeleteSurvey = (survey) => {
    setSurveyToDelete(survey);
    setShowDeleteSurveyModal(true);
  };

  const confirmDeleteSurvey = async () => {
    if (!surveyToDelete) return;
    setDeleting(true);
    try {
      const result = await SurveyService.deleteSurvey(surveyToDelete.id);
      if (result && (result.success || result.ok)) {
        showToast('Survey deleted successfully', 'success');
        loadWorkspaceData(); // Refresh list
      } else {
        showToast('Failed to delete survey', 'error');
      }
    } catch (e) {
      showToast('Error deleting survey', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteSurveyModal(false);
      setSurveyToDelete(null);
    }
  };


  const loadWorkspaceData = useCallback(async () => {
    setLoading(true);
    try {
      const [workspaceResult, activitiesResult] = await Promise.all([
        WorkspaceService.getWorkspaceById(id),
        WorkspaceService.getWorkspaceActivities(id)
      ]);

      if (workspaceResult.ok) {
        setWorkspace(workspaceResult.data);
        setSurveys(workspaceResult.data.surveys || []);
        setEditForm({
          name: workspaceResult.data.name || '',
          description: workspaceResult.data.description || '',
          visibility: workspaceResult.data.visibility || 'private'
        });
      }

      if (activitiesResult.ok) {
        setActivities(activitiesResult.activities || []);
      }
    } catch (error) {
      showToast('Error loading workspace data', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  // Real-time activity updates
  useEffect(() => {
    if (!id) return;

    // Ensure socket is initialized
    socketService.init();

    // Join workspace room
    socketService.joinRoom(`workspace_${id}`);

    const handleNewActivity = (newActivity) => {
      setActivities(prev => {
        // Prevent duplicates
        if (prev.some(a => a.id === newActivity.id)) return prev;
        return [newActivity, ...prev].slice(0, 50);
      });
    };

    const unsubscribe = socketService.on('workspaceActivity', handleNewActivity);

    return () => {
      unsubscribe();
      socketService.leaveRoom(`workspace_${id}`);
    };
  }, [id]);

  // Handle removal from workspace
  useEffect(() => {
    const handleRemoved = (data) => {
      if (parseInt(data.workspace_id) === parseInt(id)) {
        showToast(data.message || 'You have been removed from this workspace', 'info');
        navigate('/workspaces');
      }
    };

    const unsubscribe = socketService.on('workspaceMemberRemoved', handleRemoved);
    return () => unsubscribe();
  }, [id, navigate, showToast]);

  const getActivityIcon = (action) => {
    switch (action) {
      case 'survey_created': return <LuFilePlus />;
      case 'survey_updated': return <LuFilePen />;
      case 'survey_deleted': return <LuTrash2 />;
      case 'member_invited': return <LuUserPlus />;
      case 'joined': return <LuUser />;
      case 'member_role_updated': return <LuCircleArrowUp />;
      case 'analysis_finished': return <LuBrain />;
      case 'left': return <LuLogOut />;
      case 'member_removed': return <LuTrash2 />;
      case 'role_mismatch_warning': return <LuLock />;
      default: return <LuActivity />;
    }
  };

  const getActivityMessage = (activity) => {
    const actorName = activity.user?.full_name || activity.user?.username || 'System';
    const targetName = activity.metadata?.title || activity.metadata?.workspace_name || activity.metadata?.invitee_email || '';

    switch (activity.action) {
      case 'survey_created':
        return <span><strong>{actorName}</strong> created survey <strong>"{targetName}"</strong></span>;
      case 'survey_updated':
        return <span><strong>{actorName}</strong> updated survey <strong>"{targetName}"</strong></span>;
      case 'survey_deleted':
        return <span><strong>{actorName}</strong> deleted survey <strong>"{targetName}"</strong></span>;
      case 'member_invited':
        return <span><strong>{actorName}</strong> invited <strong>{targetName}</strong> to the workspace</span>;
      case 'joined':
        return <span><strong>{actorName}</strong> joined the workspace</span>;
      case 'member_role_updated':
        return <span><strong>{actorName}</strong> updated the role of a member</span>;
      case 'analysis_finished':
        return <span>AI analysis finished for <strong>"{targetName}"</strong></span>;
      case 'left':
        return <span><strong>{actorName}</strong> left the workspace</span>;
      case 'member_removed':
        return <span><strong>{actorName}</strong> removed a member</span>;
      case 'role_mismatch_warning':
        return <span className={styles.warningMessage}>{activity.metadata?.warning || 'System role mismatch detected for invited member.'}</span>;
      default:
        return <span><strong>{actorName}</strong> performed: {activity.action?.replace(/_/g, ' ')}</span>;
    }
  };

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleInvite = async (e) => {
    if (e) e.preventDefault();

    if (!inviteForm.email.trim()) {
      showToast('Email is required', 'error');
      return;
    }

    setInviting(true);
    try {
      // 1. Check user system role first
      const userCheck = await UserService.getAll({ search: inviteForm.email.trim() });
      // The backend returns { error: false, data: { users: [], ... } }
      // userCheck is response.data
      const invitedUser = userCheck.data?.users?.find(u => u.email === inviteForm.email.trim());

      if (invitedUser && invitedUser.role === 'user' && ['collaborator', 'viewer'].includes(inviteForm.role)) {
        setPendingInvitation({ email: inviteForm.email.trim(), role: inviteForm.role });
        setShowInviteWarning(true);
        setInviting(false);
        return;
      }

      await executeInvitation(inviteForm.email.trim(), inviteForm.role);
    } catch (error) {
      showToast('Error checking user role', 'error');
      setInviting(false);
    }
  };

  const executeInvitation = async (email, role) => {
    setInviting(true);
    try {
      const result = await WorkspaceService.inviteToWorkspace(id, email, role);

      if (result.ok) {
        showToast('Invitation sent successfully', 'success');
        setShowInviteModal(false);
        setInviteForm({ email: '', role: 'member' });

        if (result.invitedUserId) {
          await notificationTriggers.sendWorkspaceInvitation(id, result.invitedUserId, role);
        }
        loadWorkspaceData();
      } else {
        showToast(result.error || 'Failed to send invitation', 'error');
      }
    } catch (error) {
      showToast('Error sending invitation', 'error');
    } finally {
      setInviting(false);
      setShowInviteWarning(false);
    }
  };

  const handleRemoveMember = (userId, username) => {
    setMemberToRemove({ userId, username });
    setShowRemoveModal(true);
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;

    try {
      const result = await WorkspaceService.removeMember(id, memberToRemove.userId);
      if (result.ok) {
        showToast('Member removed successfully', 'success');
        loadWorkspaceData(); // Refresh data
      } else {
        showToast(result.error || 'Failed to remove member', 'error');
      }
    } catch (error) {
      showToast('Error removing member', 'error');
    } finally {
      setShowRemoveModal(false);
      setMemberToRemove(null);
    }
  };

  const handleUpdateWorkspace = async (e) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      showToast('Workspace name is required', 'error');
      return;
    }

    setUpdating(true);
    try {
      const result = await WorkspaceService.updateWorkspace(id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        visibility: editForm.visibility
      });

      if (result.ok) {
        showToast('Workspace updated successfully', 'success');
        setShowEditModal(false);
        loadWorkspaceData(); // Refresh data
      } else {
        showToast(result.error || 'Failed to update workspace', 'error');
      }
    } catch (error) {
      showToast('Error updating workspace', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    setDeleting(true);
    try {
      const result = await WorkspaceService.deleteWorkspace(id);

      if (result.ok) {
        showToast('Workspace deleted successfully', 'success');
        // Navigate back to workspaces list
        navigate('/workspaces');
      } else {
        showToast(result.error || 'Failed to delete workspace', 'error');
      }
    } catch (error) {
      showToast('Error deleting workspace', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    setLeaving(true);
    try {
      const result = await WorkspaceService.leaveWorkspace(id);

      if (result.ok) {
        showToast('Successfully left workspace', 'success');
        // Navigate back to workspaces list
        navigate('/workspaces');
      } else {
        showToast(result.error || 'Failed to leave workspace', 'error');
      }
    } catch (error) {
      showToast('Error leaving workspace', 'error');
    } finally {
      setLeaving(false);
      setShowLeaveModal(false);
    }
  };


  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'owner': return styles.roleOwner;
      case 'collaborator': return styles.roleCollaborator;
      case 'member': return styles.roleMember;
      case 'viewer': return styles.roleViewer;
      default: return styles.roleMember;
    }
  };


  const getNextAction = () => {
    const canManage = ['owner', 'collaborator'].includes(workspace.current_user_role || workspace.role);
    const canViewResults = ['owner', 'collaborator', 'viewer'].includes(workspace.current_user_role || workspace.role);

    // No surveys → suggest creating first survey
    if (canManage && (!surveys || surveys.length === 0)) {
      return {
        message: 'Create your first survey',
        action: () => navigate('/templates'),
        buttonText: 'Create Survey'
      };
    }

    // Has surveys but none distributed → suggest distributing
    const hasActiveSurveys = surveys.some(s => s.status === 'active' || s.status === 'published');
    if (canManage && !hasActiveSurveys && surveys.length > 0) {
      return {
        message: 'Distribute a survey',
        action: () => navigate(`/surveys/${surveys[0].id}/distribute`),
        buttonText: 'Distribute Survey'
      };
    }

    // Has active surveys → suggest viewing analytics
    if (canViewResults && hasActiveSurveys) {
      return {
        message: 'View analytics',
        action: () => navigate('/analytics'),
        buttonText: 'View Analytics'
      };
    }

    return null;
  };

  const isLockedForRoleMismatch = () => {
    return user?.role === 'user' && ['owner', 'collaborator'].includes(workspace.current_user_role || workspace.role);
  };

  const handleTakeSurvey = async (survey) => {

    try {
      // Create a workspace collector for this survey
      const result = await CollectorService.createWorkspaceCollector(survey.id, {
        name: `Workspace Response - ${survey.title}`,
        type: 'workspace',
        workspaceId: parseInt(id)  // Pass workspace ID from URL params
      });

      if (result.ok && result.data?.token) {
        // Open the response form in new tab with collector token
        window.open(`/public/${result.data.token}`, '_blank');
      } else {
        showToast('Failed to generate survey link', 'error');
      }
    } catch (error) {
      console.error('Error taking survey:', error);
      showToast('Error opening survey form', 'error');
    }
  };

  const handleRequestPromotion = async () => {
    try {
      const result = await WorkspaceService.requestPromotion(id, 'collaborator');
      if (result.ok) {
        showToast('Promotion request sent to owner', 'success');

        // Send role request notification to workspace owner
        if (workspace?.owner_id) {
          await notificationTriggers.sendRoleRequestNotification(
            id,
            workspace.owner_id,
            'collaborator',
            'promotion'
          );
        }
      } else {
        showToast(result.message || 'Failed to request promotion', 'error');
      }
    } catch (error) {
      showToast('Error requesting promotion', 'error');
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!workspace) {
    return (
      <div className={styles.error}>
        <h2>Workspace not found</h2>
        <p>The workspace you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    );
  }

  const canInvite = (workspace.current_user_role || workspace.role) === 'owner';
  const canRemoveMembers = (workspace.current_user_role || workspace.role) === 'owner';
  const canEditWorkspace = (workspace.current_user_role || workspace.role) === 'owner';
  const canDeleteWorkspace = (workspace.current_user_role || workspace.role) === 'owner';




  return (
    <div className={styles.workspaceDetail}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleRow}>
            <h1>{workspace.name}</h1>
            <span className={`${styles.roleBadge} ${getRoleBadgeClass(workspace.current_user_role || workspace.role)}`}>
              {(workspace.current_user_role || workspace.role).charAt(0).toUpperCase() + (workspace.current_user_role || workspace.role).slice(1)}
            </span>
          </div>
          {workspace.description && (
            <p className={styles.description}>{workspace.description}</p>
          )}

          <div className={styles.metadata}>
            <div className={styles.metaItem}>
              <LuUsers size={16} />
              <span>{(workspace?.members || []).length} members</span>
            </div>
            <div className={styles.divider}>•</div>
            <div className={styles.metaItem}>
              <LuFileText size={16} />
              <span>{(surveys || []).length} surveys</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          {canInvite && (
            <Button
              onClick={() => setShowInviteModal(true)}
            >
              <LuUserPlus size={16} /> Invite
            </Button>
          )}
          {canInvite && (
            <Button
              variant="outline"
              onClick={() => navigate(`/workspaces/${id}/invitations`)}
              title="Manage Invitations"
            >
              <LuClipboardList size={16} /> <span>Invitations</span>
            </Button>
          )}
          {canEditWorkspace && (
            <Button
              variant="outline"
              onClick={() => setShowEditModal(true)}
              title="Settings"
            >
              <LuSettings size={16} /> <span>Settings</span>
            </Button>
          )}
          {canDeleteWorkspace && (
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              title="Delete Workspace"
            >
              <LuTrash2 size={16} /> <span>Delete</span>
            </Button>
          )}

          {/* Promotion / Upgrade Logic */}
          {(workspace.current_user_role || workspace.role) !== 'owner' && (
            <>
              {isLockedForRoleMismatch() ? (
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  title="Upgrade to Creator"
                >
                  <LuCircleArrowUp size={16} /> <span>Upgrade to Creator</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleRequestPromotion}
                  title="Request Promotion to Collaborator"
                >
                  <LuCircleArrowUp size={16} /> <span>Request Promotion</span>
                </Button>
              )}
            </>
          )}

          {(workspace.current_user_role || workspace.role) !== 'owner' && (
            <Button
              variant="danger"
              onClick={() => setShowLeaveModal(true)}
            >
              <LuLogOut size={16} /> Leave
            </Button>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => handleTabChange('overview')}
        >
          <LuLayoutDashboard size={18} /> Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'members' ? styles.active : ''}`}
          onClick={() => handleTabChange('members')}
        >
          <LuUsers size={18} /> Members ({(workspace?.members || []).length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'surveys' ? styles.active : ''}`}
          onClick={() => handleTabChange('surveys')}
        >
          <LuFileText size={18} /> Surveys ({(surveys || []).length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'activities' ? styles.active : ''}`}
          onClick={() => handleTabChange('activities')}
        >
          <LuActivity size={18} /> Activities
        </button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <div className={styles.overview}>
            <div className={styles.statsCards}>
              <div className={styles.statCard}>
                <h3>Members</h3>
                <div className={styles.statValue}>{(workspace?.members || []).length}</div>
                <p className={styles.statLabel}>
                  {(workspace?.members || []).length === 0
                    ? 'Invite team members to collaborate'
                    : (workspace?.members || []).length === 1
                      ? 'Add more collaborators'
                      : 'Collaborating on surveys'}
                </p>
              </div>
              <div className={styles.statCard}>
                <h3>Surveys</h3>
                <div className={styles.statValue}>{(surveys || []).length}</div>
                <p className={styles.statLabel}>
                  {(surveys || []).length === 0
                    ? 'Create your first survey'
                    : `${surveys.filter(s => s.status === 'active').length} active, ${surveys.filter(s => s.status === 'draft').length} draft`}
                </p>
              </div>
              <div className={styles.statCard}>
                <h3>Recent Activity</h3>
                <div className={styles.statValue}>{(activities || []).length}</div>
                <p className={styles.statLabel}>
                  {(activities || []).length === 0
                    ? 'No activity yet'
                    : (activities || []).length === 1
                      ? 'Latest workspace action'
                      : 'Workspace actions logged'}
                </p>
              </div>
            </div>

            {/* Next Action Section */}
            {getNextAction() && (
              <div className={styles.nextAction}>
                <h3>Next Action</h3>
                <div className={styles.nextActionContent}>
                  <p className={styles.nextActionMessage}>{getNextAction().message}</p>
                  <Button
                    onClick={getNextAction().action}
                  >
                    {getNextAction().buttonText}
                  </Button>
                </div>
              </div>
            )}

            <div className={styles.recentActivities}>
              <h3>Recent Activities</h3>
              {(activities || []).slice(0, 5).map((activity, index) => (
                <div key={index} className={styles.activityItem}>
                  <div className={styles.activityUser}>
                    {activity.user?.full_name || activity.user?.username}
                  </div>
                  <div className={styles.activityAction}>
                    {getActivityMessage(activity)}
                  </div>
                  <div className={styles.activityTime}>
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {(activities || []).length === 0 && (
                <p className={styles.noData}>No recent activities</p>
              )}
              {(activities || []).length > 5 && (
                <div className={styles.viewAllLink}>
                  <Button
                    variant="ghost"
                    onClick={() => setActiveTab('activities')}
                    size="sm"
                  >
                    View all activity ({(activities || []).length} total)
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className={styles.members}>
            <div className={styles.sectionHeader}>
              <h3>Workspace Members</h3>
              {canInvite && (
                <Button
                  size="sm"
                  onClick={() => setShowInviteModal(true)}
                >
                  + Invite Member
                </Button>
              )}
            </div>
            <div className={styles.membersList}>
              {(workspace?.members || []).map((member) => (
                <div key={member.id || member.user_id} className={styles.memberCard}>
                  <div className={styles.memberAvatar}>
                    <div className={styles.avatarCircle}>
                      {(member.full_name || member.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>
                      {member.full_name || member.username || 'Unknown User'}
                    </div>
                    <div className={styles.memberEmail}>
                      {member.email}
                    </div>
                    <div className={styles.memberMeta}>
                      Joined workspace • Active member
                    </div>
                  </div>
                  <div className={styles.memberRole}>
                    <span className={`${styles.roleBadge} ${getRoleBadgeClass(member.role)}`}>
                      {member.role}
                    </span>
                  </div>
                  <div className={styles.memberActions}>
                    {canRemoveMembers && member.role !== 'owner' && (
                      <button
                        className={styles.removeButton}
                        onClick={() => handleRemoveMember(member.user_id, member.username)}
                        title="Remove member"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {(workspace?.members || []).length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <LuUsers size={32} />
                  </div>
                  <p>No members yet</p>
                  <p className={styles.emptyStateSubtext}>
                    {['owner', 'collaborator'].includes(workspace.current_user_role || workspace.role)
                      ? 'Invite team members to collaborate on surveys'
                      : 'Team members will appear here once invited by the owner'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'surveys' && (
          <div className={styles.surveys}>
            <div className={styles.sectionHeader}>
              <h3>Workspace Surveys</h3>
              {['owner', 'collaborator'].includes(workspace.current_user_role || workspace.role) && (
                <Button
                  onClick={() => navigate('/templates')}
                >
                  <LuFilePlus size={18} />
                  + Create Survey
                </Button>
              )}
            </div>
            <div className={styles.surveysList}>
              {(surveys || []).map((survey) => {
                const isCreator = user?.id === survey.created_by;
                const canManage = ['owner', 'collaborator'].includes(workspace.current_user_role || workspace.role);
                const canViewResults = ['owner', 'collaborator', 'viewer'].includes(workspace.current_user_role || workspace.role);

                return (
                  <div key={survey.id} className={styles.surveyCard}>
                    <div className={styles.surveyHeader}>
                      <h4 className={styles.surveyTitle}>{survey.title}</h4>
                      <span className={`${styles.statusBadge} ${styles[`status${survey.status}`]}`}>
                        {survey.status}
                      </span>
                    </div>
                    <div className={styles.surveyMeta}>
                      <span className={styles.surveyVisibility}>
                        {survey.visibility === 'public' ? (
                          <><LuGlobe size={14} /> Public</>
                        ) : (
                          <><LuLock size={14} /> Workspace Only</>
                        )}
                      </span>
                      <span className={styles.surveyCreated}>
                        {isCreator ? 'Created by You' : `Created by ${survey.created_by === workspace?.owner_id ? 'Owner' : 'Collaborator'}`}
                      </span>
                    </div>

                    <div className={styles.surveyActions}>
                      {/* EDIT / BUILDER */}
                      {canManage && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            if (isLockedForRoleMismatch()) {
                              setShowUpsellModal(true);
                            } else {
                              navigate(`/surveys/${survey.id}/edit`);
                            }
                          }}
                          title={isLockedForRoleMismatch() ? "Upgrade to edit" : "Edit Survey"}
                        >
                          {isLockedForRoleMismatch() ? <LuLock size={16} /> : <LuPencil size={16} />}
                          <span className={styles.btnText}>Edit</span>
                        </Button>
                      )}

                      {/* ANALYTICS */}
                      {canViewResults && (
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/surveys/${survey.id}/analytics`)}
                          title="View Results"
                        >
                          <LuChartBar size={16} /> <span className={styles.btnText}>Results</span>
                        </Button>
                      )}

                      {/* TAKE SURVEY */}
                      <Button
                        variant="secondary"
                        onClick={() => handleTakeSurvey(survey)}
                        title="Take Survey"
                      >
                        <LuPlay size={16} /> <span className={styles.btnText}>Take</span>
                      </Button>

                      {/* DELETE */}
                      {canManage && (
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (isLockedForRoleMismatch()) {
                              setShowUpsellModal(true);
                            } else {
                              handleDeleteSurvey(survey);
                            }
                          }}
                          title={isLockedForRoleMismatch() ? "Upgrade to delete" : "Delete Survey"}
                        >
                          {isLockedForRoleMismatch() ? <LuLock size={16} /> : <LuTrash2 size={16} />}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {(surveys || []).length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <LuFilePlus size={32} />
                  </div>
                  <p>No surveys yet</p>
                  <p className={styles.emptyStateSubtext}>
                    {['owner', 'collaborator'].includes(workspace.current_user_role || workspace.role)
                      ? 'Create your first survey to get started'
                      : 'Surveys will appear here once created by owners or collaborators'}
                  </p>
                  {['owner', 'collaborator'].includes(workspace.current_user_role || workspace.role) && (
                    <button
                      className={styles.createSurveyButton}
                      onClick={() => {
                        if (isLockedForRoleMismatch()) {
                          setShowUpsellModal(true);
                        } else {
                          navigate('/templates');
                        }
                      }}
                    >
                      {isLockedForRoleMismatch() ? <LuLock size={18} /> : <LuFilePlus size={18} />}
                      + Create Survey
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activities' && (
          <div className={styles.activities}>
            <div className={styles.sectionHeader}>
              <h3>Workspace Activities</h3>
            </div>
            <div className={styles.activitiesList}>
              {(activities || [])
                .filter(activity => {
                  if (activity.action === 'role_mismatch_warning') {
                    return (workspace.current_user_role || workspace.role) === 'owner';
                  }
                  return true;
                })
                .map((activity) => (
                  <div key={activity.id} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${styles[activity.action]}`}>
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityHeader}>
                        <span className={styles.activityText}>
                          {getActivityMessage(activity)}
                        </span>
                        <span className={styles.activityTime} title={new Date(activity.created_at).toLocaleString()}>
                          {formatRelativeTime(activity.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              {(activities || []).length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>
                    <LuActivity size={32} />
                  </div>
                  <p>No activities yet</p>
                  <p className={styles.emptyStateSubtext}>Workspace activities will appear here as members interact</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Member"
      >
        <form onSubmit={handleInvite} className={styles.inviteForm}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
            >
              <option value="member">Member - Can answer surveys</option>
              <option value="collaborator">Collaborator - Can create and edit surveys</option>
              <option value="viewer">Viewer - Can only view results</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="outline"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={inviting}
            >
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Workspace Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Workspace"
      >
        <form onSubmit={handleUpdateWorkspace} className={styles.editForm}>
          <div className={styles.formGroup}>
            <label htmlFor="editName">Workspace Name</label>
            <input
              id="editName"
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter workspace name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="editDescription">Description (Optional)</label>
            <textarea
              id="editDescription"
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter workspace description"
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="editVisibility">Visibility</label>
            <select
              id="editVisibility"
              value={editForm.visibility}
              onChange={(e) => setEditForm(prev => ({ ...prev, visibility: e.target.value }))}
            >
              <option value="private">Private - Only invited members can see</option>
              <option value="public">Public - Anyone can request to join</option>
            </select>
          </div>

          <div className={styles.formActions}>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={updating}
            >
              Update Workspace
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Workspace"
      >
        <div className={styles.deleteConfirmation}>
          <p>Are you sure you want to delete <strong>{workspace.name}</strong>?</p>
          <p className={styles.deleteWarning}>
            This action cannot be undone. All surveys, responses, and data associated with this workspace will be permanently deleted.
          </p>

          <div className={styles.formActions}>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteWorkspace}
              loading={deleting}
            >
              Delete Workspace
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={showRemoveModal}
        title="Remove Member"
        message={`Are you sure you want to remove ${memberToRemove?.username} from this workspace?`}
        confirmText="Remove"
        cancelText="Cancel"
        confirmColor="danger"
        onConfirm={handleConfirmRemove}
        onCancel={() => {
          setShowRemoveModal(false);
          setMemberToRemove(null);
        }}
      />

      <ConfirmModal
        isOpen={showLeaveModal}
        title="Leave Workspace"
        message={`Are you sure you want to leave "${workspace.name}"? You will need to be re-invited to access this workspace again.`}
        confirmText={leaving ? 'Leaving...' : 'Leave Workspace'}
        cancelText="Cancel"
        confirmColor="danger"
        onConfirm={handleLeaveWorkspace}
        onCancel={() => setShowLeaveModal(false)}
      />

      {/* Delete Survey Confirmation */}
      <ConfirmModal
        isOpen={showDeleteSurveyModal}
        onClose={() => setShowDeleteSurveyModal(false)}
        onConfirm={confirmDeleteSurvey}
        title="Delete Survey?"
        message={`Are you sure you want to delete "${surveyToDelete?.title}"? This will delete all collected responses and cannot be undone.`}
        confirmText="Delete Survey"
        cancelText="Cancel"
        confirmColor="danger"
        isLoading={deleting}
      />

      {/* Upgrade Modals Integration */}
      <UpgradeUpsellModal
        isOpen={showUpsellModal}
        onClose={() => setShowUpsellModal(false)}
        onUpgrade={() => setShowUpgradeModal(true)}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      <InvitationWarningModal
        isOpen={showInviteWarning}
        onClose={() => setShowInviteWarning(false)}
        inviteeEmail={pendingInvitation?.email}
        selectedRole={pendingInvitation?.role}
        onConfirm={() => executeInvitation(pendingInvitation.email, pendingInvitation.role)}
      />
    </div >
  );
};

export default WorkspaceDetail;
