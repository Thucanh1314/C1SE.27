import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WorkspaceService from '../../../api/services/workspace.service';
import Loader from '../../../components/common/Loader/Loader';
import styles from './WorkspaceInvitationAccept.module.scss';

/**
 * Workspace Invitation Acceptance Page
 * Allows users to accept workspace invitations
 */
const WorkspaceInvitationAccept = () => {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [workspaceData, setWorkspaceData] = useState(null);

  const acceptInvitation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await WorkspaceService.acceptInvitation(inviteToken);

      if (response && response.ok) {
        setSuccess(true);
        setWorkspaceData(response.workspace);
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate(`/workspaces/${response.workspace.id}`);
        }, 3000);
      } else {
        setError(response?.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting workspace invitation:', error);
      setError(error.response?.data?.message || error.message || 'An error occurred while accepting the invitation');
    } finally {
      setLoading(false);
    }
  }, [inviteToken, navigate]);

  useEffect(() => {
    acceptInvitation();
  }, [acceptInvitation]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader />
          <p>Processing your workspace invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>❌</div>
            <h2>Invalid Invitation</h2>
            <p>{error}</p>
            <div className={styles.actions}>
              <button onClick={() => navigate('/')} className={styles.primaryButton}>
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successContent}>
            <div className={styles.successIcon}>✅</div>
            <h2>Invitation Accepted!</h2>
            <p>You have successfully joined the workspace.</p>
            {workspaceData?.name && (
              <div className={styles.workspaceInfo}>
                <p>
                  Workspace: <strong>{workspaceData.name}</strong>
                </p>
              </div>
            )}
            <p className={styles.redirectMessage}>
              Redirecting to workspace in a few seconds...
            </p>
            <div className={styles.actions}>
              <button
                onClick={() => navigate(`/workspaces/${workspaceData.id}`)}
                className={styles.primaryButton}
              >
                Go to Workspace Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default WorkspaceInvitationAccept;
