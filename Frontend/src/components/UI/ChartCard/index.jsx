import React from 'react';
import styles from './ChartCard.module.scss';

/**
 * ChartCard Component
 * Wrapper for Chart.js charts with title, description, and legend
 */
const ChartCard = ({ 
  title, 
  description, 
  children, 
  loading = false,
  actions 
}) => {
  if (loading) {
    return (
      <div className={`${styles.card} ${styles.loading}`}>
        <div className={styles.header}>
          <div className={styles.skeletonTitle}></div>
          <div className={styles.skeletonSubtitle}></div>
        </div>
        <div className={styles.chartSkeleton}></div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      {(title || actions) && (
        <div className={styles.header}>
          <div className={styles.headerContent}>
            {title && <h3 className={styles.title}>{title}</h3>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && (
            <div className={styles.actions}>
              {actions}
            </div>
          )}
        </div>
      )}
      
      <div className={styles.chartContainer}>
        {children}
      </div>
    </div>
  );
};

export default ChartCard;
