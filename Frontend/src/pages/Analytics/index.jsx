import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import SurveyService from '../../api/services/survey.service';
import ResponseService from '../../api/services/response.service';
import Loader from '../../components/common/Loader/Loader';
// import StatusBadge from '../../components/UI/StatusBadge'; // Unused
import styles from './Analytics.module.scss';

const AnalyticsPage = () => {
    const navigate = useNavigate();
    const { showError } = useToast();

    const [loading, setLoading] = useState(true);
    const [surveys, setSurveys] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [surveyStats, setSurveyStats] = useState({});

    // Fetch user's surveys
    const fetchSurveys = useCallback(async () => {
        try {
            setLoading(true);
            const data = await SurveyService.getAll();
            const surveyList = data?.surveys || data?.data?.surveys || [];
            setSurveys(surveyList);

            // Fetch all response counts in parallel using Promise.all
            // This prevents race conditions and ensures all data is fetched correctly
            const statsPromises = surveyList.map(async (survey) => {
                try {
                    const responses = await ResponseService.getResponsesBySurvey(survey.id);
                    // Validate response data structure
                    const responseCount = responses?.pagination?.total || responses?.responses?.length || 0;
                    return {
                        surveyId: survey.id,
                        responseCount,
                        hasError: false
                    };
                } catch (error) {
                    console.error(`Error fetching stats for survey ${survey.id}:`, error);
                    // Return error state instead of failing silently
                    return {
                        surveyId: survey.id,
                        responseCount: 0,
                        hasError: true
                    };
                }
            });

            // Wait for all promises to complete
            const statsResults = await Promise.all(statsPromises);

            // Update state once with all results to prevent race conditions
            const newStats = {};
            statsResults.forEach(({ surveyId, responseCount, hasError }) => {
                newStats[surveyId] = { responseCount, hasError };
            });
            setSurveyStats(newStats);

        } catch (error) {
            console.error('Error fetching surveys:', error);
            showError('Failed to load surveys');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchSurveys();
    }, [fetchSurveys]);

    // Filter surveys based on search term
    const filteredSurveys = surveys.filter(survey =>
        survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        survey.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSurveyClick = (surveyId) => {
        navigate(`/surveys/${surveyId}/results`);
    };

    if (loading) {
        return <Loader fullScreen message="Loading surveys..." />;
    }

    return (
        <div className={styles.analyticsPage}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Analytics Dashboard</h1>
                    <p className={styles.subtitle}>Select a survey to explore responses and insights</p>
                </div>
            </div>

            {surveys.length === 0 ? (
                <div className={styles.emptyState}>
                    <h3>No Surveys Found</h3>
                    <p>Create a survey to start collecting data.</p>
                    <button onClick={() => navigate('/templates')} className={styles.textAction}>
                        Create Survey →
                    </button>
                </div>
            ) : (
                <>
                    {/* Search and Summary Bar */}
                    <div className={styles.filters}>
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder="Search surveys..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.summaryText}>
                            {filteredSurveys.length} surveys · {Object.values(surveyStats).reduce((acc, curr) => acc + (curr.responseCount || 0), 0)} total responses
                        </div>
                    </div>

                    {/* Survey Cards Grid */}
                    {filteredSurveys.length === 0 ? (
                        <div className={styles.emptyState}>
                            <h3>No surveys found</h3>
                            <p>Try adjusting your search terms</p>
                        </div>
                    ) : (
                        <div className={styles.grid}>
                            {filteredSurveys.map((survey) => {
                                const stats = surveyStats[survey.id] || {};
                                const questionCount = survey.template?.Questions?.length || 0;
                                const responseCount = stats.responseCount || 0;
                                const hasResponses = responseCount > 0;

                                return (
                                    <div
                                        key={survey.id}
                                        className={styles.card}
                                        onClick={() => handleSurveyClick(survey.id)}
                                    >
                                        <div className={styles.cardHeader}>
                                            <h3 className={styles.cardTitle}>{survey.title}</h3>
                                            <span className={styles.statusText}>{survey.status}</span>
                                        </div>

                                        <div className={styles.metaLine}>
                                            <span>{responseCount} responses</span>
                                            <span className={styles.dot}>·</span>
                                            <span>{questionCount} questions</span>
                                            <span className={styles.dot}>·</span>
                                            <span>Created {new Date(survey.created_at).toLocaleDateString()}</span>
                                        </div>

                                        <div className={styles.cardBody}>
                                            {!hasResponses ? (
                                                <p className={styles.noDataText}>No responses yet</p>
                                            ) : (
                                                <p className={styles.insightHint}>
                                                    {responseCount < 5 ? 'Not ready for full analytics' : 'Insights available'}
                                                </p>
                                            )}
                                        </div>

                                        <div className={styles.cardFooter}>
                                            <button
                                                className={styles.primaryBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleSurveyClick(survey.id);
                                                }}
                                            >
                                                View Analytics
                                            </button>
                                            <button
                                                className={styles.textBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/surveys/${survey.id}/distribute`);
                                                }}
                                            >
                                                Distribute
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AnalyticsPage;
