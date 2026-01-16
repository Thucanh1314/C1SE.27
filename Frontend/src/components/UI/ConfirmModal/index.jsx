import React from 'react';
import Modal from '../../common/Modal/Modal';
import Button from '../Button';
import styles from './ConfirmModal.module.scss';

/**
 * ConfirmModal Component
 * Reusable confirmation dialog for destructive actions
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onCancel, // Support alias
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'danger',
  isDanger = false, // Handle legacy support
  isLoading = false
}) => {
  const handleClose = onCancel || onClose;
  const effectiveColor = isDanger ? 'danger' : confirmColor;

  const getConfirmButtonClass = () => {
    switch (effectiveColor) {
      case 'danger': return styles.danger;
      case 'warning': return styles.warning;
      case 'primary': return styles.primary;
      default: return styles.danger;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="small"
    >
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          {effectiveColor === 'danger' && (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="#ef4444" strokeWidth="2" />
              <path d="M24 16v12M24 32h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
          {effectiveColor === 'warning' && (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 8l16 28H8L24 8z" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
              <path d="M24 20v8M24 32h.01" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <p className={styles.message}>{message}</p>
      </div>

      <div className={styles.footer}>
        <Button
          variant="outline"
          onClick={handleClose}
        >
          {cancelText}
        </Button>
        <Button
          variant={effectiveColor === 'danger' ? 'danger' : 'primary'}
          onClick={onConfirm}
          loading={isLoading}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
