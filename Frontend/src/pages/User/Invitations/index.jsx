import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate } from 'react-router-dom';
import WorkspaceService from '../../../api/services/workspace.service';
import Loader from '../../../components/common/Loader/Loader';
import { useToast } from '../../../contexts/ToastContext';
import styles from './Invitations.module.scss';
import Button from '../../../components/UI/Button';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import { useLanguage } from '../../../contexts/LanguageContext';

const Invitations = () => {
    const { t } = useLanguage();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [invitations, setInvitations] = useState([]);

    const [highlightedId, setHighlightedId] = useState(null);
    const location = window.location;

    // Acceptance Modal State
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [inviteToAccept, setInviteToAccept] = useState(null);
    const [accepting, setAccepting] = useState(false);

    const fetchInvitations = useCallback(async () => {
        try {
            setLoading(true);
            const response = await WorkspaceService.getReceivedInvitations();
            const fetchedInvitations = response.invitations || [];

            setInvitations(fetchedInvitations);

            const params = new URLSearchParams(location.search);
            const inviteId = params.get('inviteId');

            if (inviteId) {
                setHighlightedId(parseInt(inviteId));
                setTimeout(() => {
                    const element = document.getElementById(`invite-${inviteId}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 500);
            }

        } catch (error) {
            console.error('Error fetching invitations:', error);
            showToast(t('failed_load_invitations'), 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast, location.search, t]);

    useEffect(() => {
        fetchInvitations();
    }, [fetchInvitations]);

    const handleAcceptClick = (invite) => {
        setInviteToAccept(invite);
        setShowAcceptModal(true);
    };

    const handleConfirmAccept = async () => {
        if (!inviteToAccept) return;

        try {
            setAccepting(true);
            const result = await WorkspaceService.acceptInvitation(inviteToAccept.token);
            if (result.ok) {
                showToast(t('invitation_accepted') || 'Invitation accepted!', 'success');
                setShowAcceptModal(false);
                setInviteToAccept(null);
                fetchInvitations();
            } else {
                showToast(result.error || t('failed_accept_invitation') || 'Failed to accept invitation', 'error');
            }
        } catch (error) {
            showToast(t('failed_accept_invitation') || 'Failed to accept invitation', 'error');
        } finally {
            setAccepting(false);
        }
    };

    const handleDecline = async (id) => {
        if (!window.confirm(t('decline_confirm') || 'Are you sure you want to decline this invitation?')) return;

        try {
            setLoading(true);
            const result = await WorkspaceService.declineInvitation(id);
            if (result.ok) {
                showToast(t('invitation_declined') || 'Invitation declined', 'info');
                fetchInvitations();
            } else {
                showToast(result.error || t('failed_decline_invitation') || 'Failed to decline invitation', 'error');
            }
        } catch (error) {
            showToast(t('failed_decline_invitation') || 'Failed to decline invitation', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && invitations.length === 0) return <Loader fullScreen message={t('loading')} />;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('pending_invitations')}</h1>
            </div>

            {invitations.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>✉️</div>
                    <h3>{t('no_pending_invitations')}</h3>
                    <p>{t('invitations_catch_up') || "You're all caught up! When you're invited to workspaces, they'll appear here."}</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {invitations.map((inv) => (
                        <div
                            key={inv.id}
                            id={`invite-${inv.id}`}
                            className={`${styles.card} ${highlightedId === inv.id ? styles.cardHighlight : ''}`}
                        >
                            <div className={styles.info}>
                                <h3 className={styles.workspaceName}>{inv.workspace?.name}</h3>
                                <div className={styles.meta}>
                                    <div className={styles.metaItem}>
                                        <span className={styles.label}>{t('invited_by')}</span>
                                        <span className={styles.value}>{inv.inviter?.full_name || inv.inviter?.username || inv.inviter?.email}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.label}>{t('as_role')}</span>
                                        <span className={styles.value}>{inv.role}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.label}>{t('sent')}</span>
                                        <span className={styles.value}>{new Date(inv.createdAt || inv.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.actions}>
                                <Button
                                    onClick={() => handleAcceptClick(inv)}
                                    className={styles.acceptBtn}
                                >
                                    {t('accept')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleDecline(inv.id)}
                                    className={styles.declineBtn}
                                >
                                    {t('decline')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Acceptance Confirmation Modal */}
            <ConfirmModal
                isOpen={showAcceptModal}
                onClose={() => setShowAcceptModal(false)}
                onConfirm={handleConfirmAccept}
                title={t('accept_confirm_title')}
                message={t('accept_confirm_message', { workspace: inviteToAccept?.workspace?.name })}
                confirmText={t('accept')}
                cancelText={t('cancel')}
                confirmColor="primary"
                isLoading={accepting}
            />
        </div>
    );
};

export default Invitations;
