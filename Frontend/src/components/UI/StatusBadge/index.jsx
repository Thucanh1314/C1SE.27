import React from 'react';
import PropTypes from 'prop-types';
import styles from './StatusBadge.module.scss';

/**
 * StatusBadge Component
 * Displays survey status with color-coded badges
 * @param {string} status - Survey status (draft, active, closed)
 * @param {string} size - Badge size (small, medium, large)
 */
const StatusBadge = ({ status, size = 'medium' }) => {
  const getStatusInfo = () => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return { label: 'Draft', className: styles.draft };
      case 'active':
        return { label: 'Active', className: styles.active };
      case 'closed':
        return { label: 'Closed', className: styles.closed };
      case 'scheduled':
        return { label: 'Scheduled', className: styles.scheduled };
      default:
        return { label: status || 'Unknown', className: styles.default };
    }
  };

  const statusInfo = getStatusInfo();
  const sizeClass = styles[size] || styles.medium;

  return (
    <span className={`${styles.badge} ${statusInfo.className} ${sizeClass}`}>
      {statusInfo.label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
};

export default StatusBadge;
