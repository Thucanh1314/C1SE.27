import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnalyticsService from '../../../../api/services/analytics.service';
import Loader from '../../../../components/common/Loader/Loader';
import styles from '../Results.module.scss';

const AiInsightsTab = ({ surveyId, responseCount }) => {
    // const navigate = useNavigate(); // Unused
    const [loading, setLoading] = useState(false);
    const [insights, setInsights] = useState(null);

    const generateInsights = async () => {
        setLoading(true);
        try {
            const data = await AnalyticsService.getAiInsights(surveyId);
            if (data && (data.summary || data.key_findings)) {
                setInsights(data);
            }
        } catch (error) {
            console.error('Failed to generate insights:', error);
        } finally {
            setLoading(false);
        }
    };

    // Show locked preview if no responses
    if (responseCount === 0) {
        return (
            <div className={styles.tabContent}>
                <div className={styles.lockedPreview}>
                    <h3>AI Insights</h3>
                    <p className={styles.lockedMessage}>
                        AI Insights will be available after collecting responses.
                    </p>
                    <div className={styles.benefitsList}>
                        <p className={styles.benefitsLabel}>What you'll get:</p>
                        <ul>
                            <li>Key trends and patterns across all responses</li>
                            <li>Sentiment analysis of open-ended feedback</li>
                            <li>Actionable recommendations based on data</li>
                            <li>Identification of response quality issues</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.tabContent}>
            {!insights && !loading && (
                <div className={styles.emptyState}>
                    <h3>Generate AI Insights</h3>
                    <p>Let AI analyze your survey results and provide actionable recommendations.</p>
                    <button onClick={generateInsights} className={styles.primaryButton}>
                        Generate Insights
                    </button>
                </div>
            )}

            {loading && (
                <div className={styles.loadingState}>
                    <Loader />
                    <p>Analyzing data... This may take a moment.</p>
                </div>
            )}

            {insights && (
                <div className={styles.insightsContainer}>
                    <div className={styles.insightSection}>
                        <h3>📝 Summary</h3>
                        <p>{insights.summary}</p>
                    </div>

                    <div className={styles.insightGrid}>
                        <div className={styles.insightCard}>
                            <h4>🔍 Key Findings</h4>
                            <ul>
                                {insights.key_findings?.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.insightCard}>
                            <h4>💡 Respondents' Needs</h4>
                            <ul>
                                {insights.respondents_needs?.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className={styles.insightCard}>
                            <h4>🚀 Recommended Actions</h4>
                            <ul>
                                {insights.recommended_actions?.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <button onClick={generateInsights} className={styles.secondaryButton}>
                        Regenerate Insights
                    </button>
                </div>
            )}
        </div>
    );
};

export default AiInsightsTab;
