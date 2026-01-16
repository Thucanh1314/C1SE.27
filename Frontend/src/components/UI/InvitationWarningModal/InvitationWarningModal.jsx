import React from 'react';
import Modal from '../../common/Modal/Modal';
import Button from '../Button';
import { LuTriangleAlert, LuArrowRight, LuUser } from 'react-icons/lu';
import styles from './InvitationWarningModal.module.scss';

const InvitationWarningModal = ({ isOpen, onClose, onConfirm, inviteeEmail, selectedRole }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Limited Access Warning"
        >
            <div className={styles.warningContainer}>
                <div className={styles.iconWrapper}>
                    <LuTriangleAlert size={32} className={styles.warningIcon} />
                </div>

                <div className={styles.content}>
                    <h3>Invitation Warning</h3>
                    <p>
                        You are inviting <strong>{inviteeEmail}</strong> as a <strong>{selectedRole}</strong>.
                    </p>

                    <div className={styles.infoBox}>
                        <LuUser className={styles.infoIcon} />
                        <p>
                            This user currently has a <strong>Regular Account</strong>. They will be able to join,
                            but they won't be able to use advanced creator features within this workspace
                            until they upgrade to a <strong>Creator</strong> account.
                        </p>
                    </div>

                    <p className={styles.question}>
                        Do you want to proceed with the invitation?
                    </p>
                </div>

                <div className={styles.actions}>
                    <Button variant="outline" onClick={onClose}>
                        No, Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={onConfirm}
                    >
                        Yes, Continue <LuArrowRight size={16} />
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default InvitationWarningModal;
