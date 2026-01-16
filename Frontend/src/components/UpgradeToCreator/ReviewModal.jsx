import React, { useState } from 'react';
import { formatDate } from '../../utils/formatters';
import UpgradeService from '../../api/services/upgrade.service';
import { useToast } from '../../contexts/ToastContext';
import styles from './ReviewModal.module.scss';

const ReviewModal = ({ request, isOpen, onClose, onSuccess }) => {
    const { showToast } = useToast();
    const [action, setAction] = useState(null); // 'approve' | 'reject' | null
    const [adminComment, setAdminComment] = useState('');
    const [createWorkspace, setCreateWorkspace] = useState(true);
    const [sendNotification, setSendNotification] = useState(true);
    const [processing, setProcessing] = useState(false);

    if (!isOpen || !request) return null;

    const handleSubmit = async () => {
        if (action === 'reject' && !adminComment.trim()) {
            showToast('Please provide a reason for rejection', 'error');
            return;
        }

        try {
            setProcessing(true);

            if (action === 'approve') {
                await UpgradeService.approveRequest(request.id, adminComment);
                showToast('Request approved successfully', 'success');
            } else {
                await UpgradeService.rejectRequest(request.id, adminComment);
                showToast('Request rejected', 'info');
            }

            onSuccess();
            onClose();
        } catch (error) {
            showToast(error.response?.data?.message || 'Action failed', 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleBack = () => {
        setAction(null);
        setAdminComment('');
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>

                <h2>Review Creator Request</h2>

                {/* User Info Section */}
                <section className={styles.section}>
                    <h3>User Info</h3>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <label>Name</label>
                            <p>{request.user?.full_name || 'Unknown'}</p>
                        </div>
                        <div className={styles.infoItem}>
                            <label>Email</label>
                            <p>{request.user?.email || '-'}</p>
                        </div>
                    </div>
                </section>

                {/* Request Details Section */}
                <section className={styles.section}>
                    <h3>Request Details</h3>
                    <div className={styles.field}>
                        <label>Intended Usage</label>
                        <p className={styles.usageBadge}>{request.intended_usage || '-'}</p>
                    </div>
                    <div className={styles.field}>
                        <label>Reason</label>
                        <div className={styles.reasonBox}>
                            {request.reason || 'No reason provided'}
                        </div>
                    </div>
                    <div className={styles.field}>
                        <label>Requested At</label>
                        <p>{formatDate(request.created_at)}</p>
                    </div>
                </section>

                {/* Reject Flow */}
                {action === 'reject' && (
                    <section className={styles.section}>
                        <label className={styles.requiredLabel}>
                            Rejection Reason *
                        </label>
                        <textarea
                            value={adminComment}
                            onChange={(e) => setAdminComment(e.target.value)}
                            placeholder="Please provide a reason for rejection..."
                            rows={4}
                            className={styles.textarea}
                            autoFocus
                        />
                    </section>
                )}

                {/* Approve Flow */}
                {action === 'approve' && (
                    <section className={styles.section}>
                        <div className={styles.confirmBox}>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M10 6v4M10 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <p>This will grant Creator access immediately.</p>
                        </div>

                        <div className={styles.checkboxGroup}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={createWorkspace}
                                    onChange={(e) => setCreateWorkspace(e.target.checked)}
                                />
                                <span>Create default workspace</span>
                            </label>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={sendNotification}
                                    onChange={(e) => setSendNotification(e.target.checked)}
                                />
                                <span>Send notification</span>
                            </label>
                        </div>

                        {adminComment && (
                            <div className={styles.field}>
                                <label>Welcome Message (optional)</label>
                                <textarea
                                    value={adminComment}
                                    onChange={(e) => setAdminComment(e.target.value)}
                                    placeholder="Add a welcome message..."
                                    rows={3}
                                    className={styles.textarea}
                                />
                            </div>
                        )}
                    </section>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                    {!action ? (
                        <>
                            <button
                                onClick={() => setAction('reject')}
                                className={styles.rejectBtn}
                                disabled={processing}
                            >
                                Reject
                            </button>
                            <button
                                onClick={() => setAction('approve')}
                                className={styles.approveBtn}
                                disabled={processing}
                            >
                                Approve
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleBack}
                                className={styles.backBtn}
                                disabled={processing}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                className={action === 'approve' ? styles.approveBtn : styles.rejectBtn}
                                disabled={processing || (action === 'reject' && !adminComment.trim())}
                            >
                                {processing ? 'Processing...' : `Confirm ${action === 'approve' ? 'Approval' : 'Rejection'}`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReviewModal;
