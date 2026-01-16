import React from 'react';
import styles from './QualityScoreCard.module.scss';
import {
    LuCircleCheck, LuClock, LuLayoutDashboard, LuAlignLeft, LuStar,
    LuTriangleAlert, LuClipboardList, LuCircleAlert
} from 'react-icons/lu';

const QualityScoreCard = ({ data, loading, error, responseCount }) => {
    // --- 1. Loading State ---
    if (loading) {
        return (
            <div className={styles.qualitySection}>
                <h2>Survey Quality Analysis</h2>
                <div className={styles.loadingContainer}>
                    <div className={styles.spinner}></div>
                    <p>Analyzing survey quality...</p>
                </div>
            </div>
        );
    }

    // --- 2. Error State ---
    if (error) {
        return (
            <div className={styles.qualitySection}>
                <h2>Survey Quality Analysis</h2>
                <div className={styles.errorContainer}>
                    <LuCircleAlert size={40} />
                    <h3>Unable to load quality analysis</h3>
                    <p>An error occurred while loading analysis data.</p>
                </div>
            </div>
        );
    }

    // --- 3. Empty State ---
    if (responseCount === 0 || (!data && !loading)) {
        return (
            <div className={styles.qualitySection}>
                <h2>Survey Quality Analysis</h2>
                <div className={styles.emptyContainer}>
                    <LuClipboardList className={styles.emptyIcon} />
                    <h3>Insufficient Data for Analysis</h3>
                    <p>The survey needs responses for the system to analyze quality. Share the survey to collect more data.</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { totalScore, factors } = data;

    const getScoreColor = (score) => {
        if (score >= 80) return '#10B981'; // Green
        if (score >= 50) return '#F59E0B'; // Yellow
        return '#EF4444'; // Red
    };

    const getScoreLabel = (score) => {
        if (score >= 80) return 'Excellent';
        if (score >= 50) return 'Good';
        return 'Needs Improvement';
    };

    // Metric Card Component
    const MetricCard = ({ icon: Icon, title, score, maxScore, details, warnings }) => {
        const isUnavailable = score === null || score === undefined;
        const percentage = !isUnavailable ? (score / maxScore) * 100 : 0;
        const color = getScoreColor(percentage);

        return (
            <div className={styles.metricCard}>
                <div className={styles.metricHeader}>
                    <Icon className={styles.metricIcon} style={{ color }} />
                    <h3>{title}</h3>
                </div>

                <div className={styles.metricScore}>
                    {!isUnavailable ? (
                        <>
                            <span className={styles.score} style={{ color }}>{score}</span>
                            <span className={styles.maxScore}>/{maxScore}</span>
                        </>
                    ) : (
                        <span className={styles.unavailable}>N/A</span>
                    )}
                </div>

                {details && (
                    <div className={styles.metricDetails}>
                        {Object.entries(details).map(([key, val]) => (
                            <div key={key} className={styles.detailItem}>
                                <span className={styles.detailLabel}>{key}:</span>
                                <span className={styles.detailValue}>{val}</span>
                            </div>
                        ))}
                    </div>
                )}

                {warnings && warnings.length > 0 && (
                    <div className={styles.metricWarning}>
                        <LuTriangleAlert />
                        <span>{warnings[0]}</span>
                    </div>
                )}

                {!isUnavailable && (
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{
                                width: `${percentage}%`,
                                backgroundColor: color
                            }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={styles.qualitySection}>
            <div className={styles.qualityHeader}>
                <h2>Survey Quality Analysis</h2>
                <div className={styles.overallScore}>
                    <div className={styles.scoreCircle} style={{ borderColor: getScoreColor(totalScore) }}>
                        <span className={styles.scoreValue} style={{ color: getScoreColor(totalScore) }}>
                            {totalScore}
                        </span>
                        <span className={styles.scoreLabel}>/ 100</span>
                    </div>
                    <div className={styles.scoreInfo}>
                        <h3 style={{ color: getScoreColor(totalScore) }}>
                            {getScoreLabel(totalScore)}
                        </h3>
                        <p>Based on {responseCount} response{responseCount !== 1 ? 's' : ''}</p>
                    </div>
                </div>
            </div>

            <div className={styles.metricsGrid}>
                <MetricCard
                    icon={LuCircleCheck}
                    title="Completion Rate"
                    score={factors?.completion?.score}
                    maxScore={20}
                    details={factors?.completion?.details}
                    warnings={factors?.completion?.warnings}
                />
                <MetricCard
                    icon={LuClock}
                    title="Time Behavior"
                    score={factors?.time?.score}
                    maxScore={20}
                    details={factors?.time?.details}
                    warnings={factors?.time?.warnings}
                />
                <MetricCard
                    icon={LuLayoutDashboard}
                    title="Question Design"
                    score={factors?.design?.score}
                    maxScore={20}
                    details={factors?.design?.details}
                    warnings={factors?.design?.warnings}
                />
                <MetricCard
                    icon={LuAlignLeft}
                    title="Text Quality"
                    score={factors?.textQuality?.score}
                    maxScore={20}
                    details={factors?.textQuality?.details}
                    warnings={factors?.textQuality?.warnings}
                />
                <MetricCard
                    icon={LuStar}
                    title="User Feedback"
                    score={factors?.userFeedback?.score}
                    maxScore={20}
                    details={factors?.userFeedback?.details}
                    warnings={factors?.userFeedback?.warnings}
                />
            </div>

            {/* Recent Feedback Section */}
            {factors?.userFeedback?.comments && factors.userFeedback.comments.length > 0 && (
                <div className={styles.feedbackListSection}>
                    <h3>Recent User Feedback</h3>
                    <div className={styles.feedbackList}>
                        {factors.userFeedback.comments.map((fb) => (
                            <div key={fb.id} className={styles.feedbackItem}>
                                <div className={styles.feedbackHeader}>
                                    <div className={styles.starRating}>
                                        {[...Array(5)].map((_, i) => (
                                            <LuStar
                                                key={i}
                                                size={14}
                                                fill={i < fb.rating ? "#F59E0B" : "none"}
                                                color={i < fb.rating ? "#F59E0B" : "#CBD5E1"}
                                            />
                                        ))}
                                    </div>
                                    <span className={styles.feedbackDate}>
                                        {new Date(fb.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className={styles.feedbackComment}>"{fb.comment}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityScoreCard;
