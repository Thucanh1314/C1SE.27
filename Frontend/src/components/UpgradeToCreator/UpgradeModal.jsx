import React, { useState, useEffect } from 'react';
import styles from './UpgradeModal.module.scss';
import UpgradeService from '../../api/services/upgrade.service';
import { useToast } from '../../contexts/ToastContext';
import { graduationCapIcon, briefcaseIcon, userIcon, sparkleIcon } from './icons';

const UpgradeModal = ({ isOpen, onClose }) => {
    const { showToast } = useToast();

    const [loading, setLoading] = useState(false);
    const [existingRequest, setExistingRequest] = useState(null);

    // Form State
    const [reason, setReason] = useState('');
    const [usage, setUsage] = useState('other');
    const [agreed, setAgreed] = useState(false);

    // Usage options with icons
    const usageOptions = [
        { value: 'academic', label: 'Academic', icon: graduationCapIcon },
        { value: 'business', label: 'Business', icon: briefcaseIcon },
        { value: 'personal', label: 'Personal', icon: userIcon },
        { value: 'other', label: 'Other', icon: sparkleIcon }
    ];

    // Check for existing request on mount/open
    useEffect(() => {
        if (isOpen) {
            checkStatus();
        }
    }, [isOpen]);

    const checkStatus = async () => {
        try {
            setLoading(true);
            const res = await UpgradeService.getMyRequest();
            if (res?.data) {
                setExistingRequest(res.data);
            }
        } catch (error) {
            console.error('Failed to check request status', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!agreed) {
            showToast('Please agree to the terms.', 'error');
            return;
        }

        try {
            setLoading(true);
            await UpgradeService.createRequest({
                reason,
                intended_usage: usage
            });
            showToast("Request submitted. You'll be notified once it's reviewed.", 'success');
            setExistingRequest({ status: 'pending', created_at: new Date() });
            onClose();
        } catch (error) {
            showToast(error.response?.data?.message || 'Failed to submit request', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>

                {loading && !existingRequest ? (
                    <div className={styles.loading}>Loading status...</div>
                ) : existingRequest ? (
                    <div className={styles.statusView}>
                        <div className={`${styles.statusBadge} ${styles[existingRequest.status]}`}>
                            Request {existingRequest.status}
                        </div>

                        {existingRequest.status === 'pending' && (
                            <p>Your request is currently under review. We will notify you once it is approved.</p>
                        )}

                        {existingRequest.status === 'rejected' && (
                            <div className={styles.rejectionInfo}>
                                <p>Your request was not approved.</p>
                                {existingRequest.admin_comment && (
                                    <div className={styles.adminComment}>
                                        <strong>Admin Comment:</strong> {existingRequest.admin_comment}
                                    </div>
                                )}
                                <p>You may submit a new request later.</p>
                                <button className={styles.retryBtn} onClick={() => setExistingRequest(null)}>
                                    Submit New Request
                                </button>
                            </div>
                        )}

                        <div className={styles.actions}>
                            <button onClick={onClose} className={styles.secondaryBtn}>Close</button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className={styles.header}>
                            <h2>Become a Creator</h2>
                            <p className={styles.subtitle}>
                                Create surveys, manage workspaces, and access advanced analytics.
                            </p>
                            <p className={styles.sla}>
                                Approval usually takes less than 24 hours.
                            </p>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Intended Usage</label>
                            <div className={styles.cardGrid}>
                                {usageOptions.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`${styles.card} ${usage === option.value ? styles.cardSelected : ''}`}
                                        onClick={() => setUsage(option.value)}
                                    >
                                        <span className={styles.cardIcon}>{option.icon}</span>
                                        <span className={styles.cardLabel}>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>How do you plan to use Creator features? (optional)</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Example: I want to collect customer feedback for my startup."
                                rows={3}
                            />
                        </div>

                        <div className={styles.checkboxGroup}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                />
                                I agree to responsibly manage any data I collect.
                            </label>
                        </div>

                        <div className={styles.actions}>
                            <button type="button" onClick={onClose} className={styles.secondaryBtn} disabled={loading}>
                                Cancel
                            </button>
                            <button type="submit" className={styles.primaryBtn} disabled={loading || !agreed}>
                                {loading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default UpgradeModal;
