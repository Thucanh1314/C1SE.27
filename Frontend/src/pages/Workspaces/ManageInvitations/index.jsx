import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LuArrowLeft, LuRefreshCcw, LuX, LuMail, LuUser, LuClock, LuCircleCheck, LuCircleAlert } from 'react-icons/lu';
import styles from './ManageInvitations.module.scss';
import WorkspaceService from '../../../api/services/workspace.service';
import Modal from '../../../components/common/Modal/Modal';
import Button from '../../../components/UI/Button';

const ManageInvitations = () => {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();

  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);
  const [error, setError] = useState(null);
  const [workspace, setWorkspace] = useState(null);

  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isConfirming: false
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Get workspace info
      const workspaceResult = await WorkspaceService.getWorkspace(workspaceId);
      if (!workspaceResult.ok) {
        setError('Failed to load workspace');
        return;
      }
      setWorkspace(workspaceResult.data);

      // Get pending invitations
      const invitationsResult = await WorkspaceService.getPendingInvitations(workspaceId);
      if (invitationsResult.ok) {
        setInvitations(invitationsResult.invitations || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelInvitation = (invitationId) => {
    setModal({
      isOpen: true,
      type: 'warning',
      title: 'Cancel Invitation',
      message: 'Are you sure you want to cancel this invitation? This action cannot be undone.',
      confirmText: 'Yes, cancel it',
      cancelText: 'No, keep it',
      onConfirm: async () => {
        setModal(prev => ({ ...prev, isConfirming: true }));
        try {
          const result = await WorkspaceService.cancelInvitation(invitationId);
          if (result.ok) {
            // Remove from list immediately
            setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

            // Success feedback
            setModal({
              isOpen: true,
              type: 'success',
              title: 'Success',
              message: 'The invitation has been successfully cancelled and removed.',
              confirmText: 'Done',
              onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
            });
          } else {
            throw new Error(result.error || result.message || 'Failed to cancel invitation');
          }
        } catch (err) {
          setModal({
            isOpen: true,
            type: 'error',
            title: 'Error',
            message: err.message || 'Failed to cancel invitation. Please try again.',
            confirmText: 'Close',
            onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
          });
        }
      }
    });
  };

  const handleResendInvitation = async (invitationId) => {
    setResendingId(invitationId);
    try {
      const result = await WorkspaceService.resendInvitation(invitationId);
      if (result.ok) {
        setModal({
          isOpen: true,
          type: 'success',
          title: 'Invitation Sent',
          message: 'The invitation email has been resent successfully.',
          confirmText: 'Great',
          onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
        });
      } else {
        throw new Error(result.message || 'Failed to resend');
      }
    } catch (err) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to resend invitation',
        confirmText: 'Close',
        onConfirm: () => setModal(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setResendingId(null);
    }
  };

  if (loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <Button
          variant="outline"
          onClick={() => navigate(`/workspaces/${workspaceId}`)}
        >
          Back to Workspace
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button
          variant="ghost"
          onClick={() => navigate(`/workspaces/${workspaceId}`)}
          size="sm"
          className={styles.backButton}
        >
          <LuArrowLeft size={18} />
          <span>Back</span>
        </Button>
        <div className={styles.titleSection}>
          <h1>Manage Invitations</h1>
          <p className={styles.workspaceName}>Workspace: <span>{workspace?.name}</span></p>
        </div>
      </div>

      <div className={styles.contentCard}>
        {invitations.length === 0 ? (
          <div className={styles.emptyState}>
            <LuMail size={48} className={styles.emptyIcon} />
            <p>No pending invitations</p>
            <span>Invited collaborators will appear here.</span>
          </div>
        ) : (
          <div className={styles.invitationsTable}>
            <div className={styles.tableHeader}>
              <div className={styles.colEmail}>RECIPIENT</div>
              <div className={styles.colRole}>ROLE</div>
              <div className={styles.colStatus}>STATUS</div>
              <div className={styles.colDate}>SENT DATE</div>
              <div className={styles.colActions}></div>
            </div>

            <div className={styles.tableBody}>
              {invitations.map(invitation => (
                <div key={invitation.id} className={styles.tableRow}>
                  <div className={styles.colEmail}>
                    <div className={styles.emailWrapper}>
                      <LuUser size={16} className={styles.userIcon} />
                      <span>{invitation.invitee_email}</span>
                    </div>
                  </div>

                  <div className={styles.colRole}>
                    <span className={styles.roleLabel}>{invitation.role}</span>
                  </div>

                  <div className={styles.colStatus}>
                    <div className={`${styles.statusBadge} ${styles[invitation.status]}`}>
                      <LuClock size={12} />
                      <span>{invitation.status}</span>
                    </div>
                  </div>

                  <div className={styles.colDate}>
                    <span className={styles.dateText}>
                      {new Date(invitation.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className={styles.colActions}>
                    <div className={styles.actionGroup}>
                      <Button
                        variant="secondary"
                        onClick={() => handleResendInvitation(invitation.id)}
                        loading={resendingId === invitation.id}
                        size="sm"
                        title="Resend Invitation"
                      >
                        <LuRefreshCcw size={14} className={resendingId === invitation.id ? styles.spinning : ''} />
                        Resend
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleCancelInvitation(invitation.id)}
                        size="sm"
                        title="Cancel Invitation"
                      >
                        <LuX size={16} />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        size="small"
        footer={
          <div className={styles.modalFooter}>
            <Button
              variant="text"
              onClick={() => setModal(prev => ({ ...prev, isOpen: false }))}
            >
              {modal.cancelText || 'Cancel'}
            </Button>
            <Button
              variant={modal.type === 'error' || modal.type === 'warning' ? 'danger' : 'primary'}
              onClick={modal.onConfirm}
              loading={modal.isConfirming}
            >
              {modal.confirmText || 'OK'}
            </Button>
          </div>
        }
      >
        <div className={styles.modalBody}>
          <div className={`${styles.modalIcon} ${styles[modal.type]}`}>
            {modal.type === 'success' && <LuCircleCheck size={40} />}
            {(modal.type === 'error' || modal.type === 'warning') && <LuCircleAlert size={40} />}
          </div>
          <p>{modal.message}</p>
        </div>
      </Modal>
    </div>
  );
};

export default ManageInvitations;
