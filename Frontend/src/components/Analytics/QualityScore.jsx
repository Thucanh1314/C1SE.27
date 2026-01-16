import React from 'react';
import PropTypes from 'prop-types';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import styles from './QualityScore.module.scss';

const QualityScore = ({ data, loading, error }) => {
    if (loading) {
        return <div className={styles.loading}>Đang tính toán điểm chất lượng...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!data) return null;

    const { score, factors, warnings, lastUpdated } = data;

    // Calculate gauge rotation based on score (0-100)
    // -45deg is 0, 135deg is 100 based on standard half-circle gauge CSS
    // actually, let's look at the SCSS: transform: rotate(-45deg); /* Start from left */
    // If it's a half circle (180 deg span), 0 = -45deg? Wait.
    // Usually border-left and border-top are colored. 
    // Let's assume 0% = -45deg, 100% = 135deg (total 180deg).
    const rotation = -45 + (score / 100) * 180;

    const getScoreColor = (value) => {
        if (value >= 80) return '#16a34a'; // Green
        if (value >= 50) return '#eab308'; // Yellow
        return '#dc2626'; // Red
    };

    const getFactorClass = (rating) => {
        switch (rating?.toLowerCase()) {
            case 'good': return styles.good;
            case 'average': return styles.average;
            case 'poor': return styles.poor;
            default: return '';
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2>Điểm Chất Lượng Khảo Sát</h2>
                    {lastUpdated && (
                        <span className={styles.lastUpdated}>
                            Cập nhật: {new Date(lastUpdated).toLocaleString()}
                        </span>
                    )}
                </div>
            </div>

            <div className={styles.scoreSection}>
                <div className={styles.gaugeContainer}>
                    <div className={styles.gaugeBackground}></div>
                    <div
                        className={styles.gaugeFill}
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            borderTopColor: getScoreColor(score),
                            borderRightColor: getScoreColor(score)
                        }}
                    ></div>
                    <div className={styles.scoreValue} style={{ color: getScoreColor(score) }}>
                        {score}
                    </div>
                </div>
                <div className={styles.scoreLabel}>
                    {score >= 80 ? 'Rất Tốt' : score >= 50 ? 'Trung Bình' : 'Cần Cải Thiện'}
                </div>
            </div>

            <div className={styles.factorsGrid}>
                {factors && factors.map((factor, index) => (
                    <div key={index} className={styles.factorCard}>
                        <div className={styles.cardHeader}>
                            <h3>{factor.name}</h3>
                            <span className={`${styles.factorScore} ${getFactorClass(factor.rating)}`}>
                                {factor.score}/10
                            </span>
                        </div>

                        <p className={styles.description}>{factor.description}</p>

                        {factor.details && (
                            <div className={styles.details}>
                                {Object.entries(factor.details).map(([key, value]) => (
                                    <div key={key} className={styles.detailItem}>
                                        <span className={styles.label}>{key}:</span>
                                        <span className={styles.value}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {factor.issues && factor.issues.length > 0 && (
                            <div className={styles.warnings}>
                                <div className={styles.warningTitle}>
                                    <FaExclamationTriangle /> Vấn đề cần khắc phục
                                </div>
                                <ul>
                                    {factor.issues.map((issue, i) => (
                                        <li key={i}>{issue}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {warnings && warnings.length > 0 && (
                <div className={`${styles.warnings} ${styles.globalWarnings}`}>
                    <h3>Khuyến nghị chung</h3>
                    <ul>
                        {warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

QualityScore.propTypes = {
    data: PropTypes.shape({
        score: PropTypes.number,
        lastUpdated: PropTypes.string,
        factors: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string,
            score: PropTypes.number,
            rating: PropTypes.string,
            description: PropTypes.string,
            details: PropTypes.object,
            issues: PropTypes.arrayOf(PropTypes.string)
        })),
        warnings: PropTypes.arrayOf(PropTypes.string)
    }),
    loading: PropTypes.bool,
    error: PropTypes.string
};

export default QualityScore;
