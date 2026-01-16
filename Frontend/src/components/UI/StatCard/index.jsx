import React from 'react';
import styles from './StatCard.module.scss';

/**
 * StatCard Component
 * Displays a metric with icon, title, value, and optional change indicator
 */
const StatCard = ({ 
  icon, 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  color = 'primary',
  loading = false 
}) => {
  const getColorClass = () => {
    switch (color) {
      case 'primary': return styles.primary;
      case 'success': return styles.success;
      case 'warning': return styles.warning;
      case 'danger': return styles.danger;
      case 'info': return styles.info;
      default: return styles.primary;
    }
  };

  const getChangeIcon = () => {
    if (changeType === 'increase') {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 12V4M8 4L4 8M8 4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    if (changeType === 'decrease') {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 4v8M8 12l-4-4M8 12l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`${styles.card} ${styles.loading}`}>
        <div className={styles.skeleton}></div>
        <div className={styles.skeletonText}></div>
        <div className={styles.skeletonValue}></div>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${getColorClass()}`}>
      <div className={styles.iconContainer}>
        {typeof icon === 'string' ? (
          <span className={styles.emoji}>{icon}</span>
        ) : (
          icon
        )}
      </div>
      
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        <h3 className={styles.value}>{value}</h3>
        
        {change !== undefined && (
          <div className={`${styles.change} ${styles[changeType]}`}>
            {getChangeIcon()}
            <span>{change}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
