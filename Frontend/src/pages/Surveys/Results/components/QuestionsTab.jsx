import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import AnalyticsService from '../../../../api/services/analytics.service';
import Loader from '../../../../components/common/Loader/Loader';
import styles from '../Results.module.scss';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const QuestionsTab = ({ surveyId, filters }) => {
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            try {
                const response = await AnalyticsService.getQuestionAnalysis(surveyId, filters);
                if (response.data?.success || (Array.isArray(response) || response.data)) {
                    // Handle various response structures (sometimes direct array, sometimes { data: [] })
                    // Backend returns { success: true, data: [...] } usually
                    setQuestions(response.data || response);
                }
            } catch (error) {
                console.error('Failed to fetch question analysis:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [surveyId, filters]);

    if (loading) return <Loader />;

    const renderChart = (question) => {
        if (question.stats.type !== 'choice') return null;

        const data = {
            labels: Object.keys(question.stats.counts),
            datasets: [
                {
                    label: 'Votes',
                    data: Object.values(question.stats.counts),
                    backgroundColor: 'rgba(53, 162, 235, 0.5)',
                },
            ],
        };

        return (
            <div className={styles.miniChart}>
                <Bar options={{ responsive: true }} data={data} />
            </div>
        );
    };

    return (
        <div className={styles.tabContent}>
            {questions.map((q, index) => (
                <div key={q.questionId} className={styles.questionCard}>
                    <div className={styles.questionHeader}>
                        <span className={styles.questionNumber}>Q{index + 1}</span>
                        <h3>{q.questionText}</h3>
                        <span className={styles.questionType}>{q.questionType}</span>
                    </div>

                    <div className={styles.questionStats}>
                        {q.stats.type === 'choice' && (
                            <>
                                {renderChart(q)}
                                <div className={styles.choiceStats}>
                                    {Object.entries(q.stats.counts).map(([opt, count]) => (
                                        <div key={opt} className={styles.choiceItem}>
                                            <span>{opt}</span>
                                            <span>{count} votes ({q.stats.answeredCount > 0 ? ((count / q.stats.answeredCount) * 100).toFixed(1) : 0}%)</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {q.stats.type === 'numeric' && (
                            <div className={styles.numericStats}>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Average:</span>
                                    <span className={styles.statValue}>{q.stats.average}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Min:</span>
                                    <span className={styles.statValue}>{q.stats.min}</span>
                                </div>
                                <div className={styles.statItem}>
                                    <span className={styles.statLabel}>Max:</span>
                                    <span className={styles.statValue}>{q.stats.max}</span>
                                </div>
                            </div>
                        )}

                        {q.stats.type === 'text' && (
                            <div className={styles.textStats}>
                                <p>{q.stats.answeredCount} responses</p>
                                <div className={styles.recentResponses}>
                                    {q.stats.recentAnswers.map((ans, i) => (
                                        <div key={i} className={styles.textResponseItem}>"{ans}"</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default QuestionsTab;
