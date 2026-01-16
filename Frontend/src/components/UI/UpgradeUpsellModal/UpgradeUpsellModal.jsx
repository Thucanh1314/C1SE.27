import React from 'react';
import Modal from '../../common/Modal/Modal';
import Button from '../Button';
import { LuLock, LuSparkles, LuArrowRight } from 'react-icons/lu';
import styles from './UpgradeUpsellModal.module.scss';

const UpgradeUpsellModal = ({ isOpen, onClose, onUpgrade }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Upgrade Account"
        >
            <div className={styles.upsellContainer}>
                <div className={styles.iconWrapper}>
                    <div className={styles.lockCircle}>
                        <LuLock size={24} />
                    </div>
                </div>

                <div className={styles.content}>
                    <h3>Feature Locked</h3>
                    <p>
                        You are a <strong>regular user</strong>. You need to upgrade to a
                        <strong> Creator</strong> account to access design tools and AI features.
                    </p>

                    <div className={styles.benefits}>
                        <div className={styles.benefitItem}>
                            <LuSparkles className={styles.benefitIcon} />
                            <span>Use AI Generator to create surveys instantly</span>
                        </div>
                        <div className={styles.benefitItem}>
                            <LuSparkles className={styles.benefitIcon} />
                            <span>Create and manage unlimited Surveys & Templates</span>
                        </div>
                        <div className={styles.benefitItem}>
                            <LuSparkles className={styles.benefitIcon} />
                            <span>Access advanced Analytics and LLM tools</span>
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <Button variant="outline" onClick={onClose}>
                        Maybe Later
                    </Button>
                    <Button
                        className={styles.upgradeBtn}
                        onClick={() => {
                            onUpgrade();
                            onClose();
                        }}
                    >
                        Upgrade to Creator Now <LuArrowRight size={16} />
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default UpgradeUpsellModal;
