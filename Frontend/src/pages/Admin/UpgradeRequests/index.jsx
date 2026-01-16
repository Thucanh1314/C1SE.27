import React, { useState, useEffect } from 'react';
import UpgradeService from '../../../api/services/upgrade.service';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate, truncateText } from '../../../utils/formatters';
import ReviewModal from '../../../components/UpgradeToCreator/ReviewModal';
import styles from './UpgradeRequests.module.scss';

// Status Badge Component with SVG dot
const StatusBadge = ({ status }) => (
    <div className={`${styles.statusBadge} ${styles[status]}`}>
        <svg className={styles.statusDot} width="8" height="8" viewBox="0 0 8 8">
            <circle cx="4" cy="4" r="4" fill="currentColor" />
        </svg>
        <span>{status}</span>
    </div>
);

const UpgradeRequests = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
    const [filter, setFilter] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);

    const fetchRequests = React.useCallback(async () => {
        try {
            setLoading(true);
            const res = await UpgradeService.getAllRequests({
                page: pagination.page,
                limit: 10,
                status: filter || undefined
            });
            setRequests(res.data.requests);
            setPagination({
                page: res.data.currentPage,
                totalPages: res.data.totalPages
            });
        } catch (error) {
            showToast('Failed to load requests', 'error');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, filter, showToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const openReviewModal = (request) => {
        setSelectedRequest(request);
    };

    const closeReviewModal = () => {
        setSelectedRequest(null);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Creator Upgrade Requests</h1>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={styles.filterSelect}
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </header>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Intended Usage</th>
                            <th>Reason</th>
                            <th>Requested At</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className={styles.loading}>Loading...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan="6" className={styles.empty}>No requests found.</td></tr>
                        ) : (
                            requests.map(req => (
                                <tr key={req.id}>
                                    <td>
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>{req.user?.full_name || 'Unknown'}</span>
                                            <span className={styles.userEmail}>{req.user?.email || '-'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={styles.usageBadge}>{req.intended_usage || '-'}</span>
                                    </td>
                                    <td className={styles.reasonCell}>
                                        <span className={styles.reasonText} title={req.reason}>
                                            {truncateText(req.reason, 60)}
                                        </span>
                                    </td>
                                    <td className={styles.dateCell}>
                                        {formatDate(req.created_at)}
                                    </td>
                                    <td>
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td>
                                        {req.status === 'pending' ? (
                                            <button
                                                className={styles.reviewButton}
                                                onClick={() => openReviewModal(req)}
                                            >
                                                Review
                                            </button>
                                        ) : (
                                            <span className={styles.reviewedText}>
                                                {req.status === 'approved' ? 'Approved' : 'Rejected'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className={styles.pagination}>
                    <button
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        disabled={pagination.page === 1}
                    >
                        Previous
                    </button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        disabled={pagination.page === pagination.totalPages}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Review Modal */}
            <ReviewModal
                request={selectedRequest}
                isOpen={!!selectedRequest}
                onClose={closeReviewModal}
                onSuccess={fetchRequests}
            />
        </div>
    );
};

export default UpgradeRequests;
