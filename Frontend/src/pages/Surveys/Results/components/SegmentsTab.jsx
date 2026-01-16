import React, { useEffect, useState } from 'react';
import AnalyticsService from '../../../../api/services/analytics.service';
import Loader from '../../../../components/common/Loader/Loader';
import styles from '../Results.module.scss';

const SegmentsTab = ({ surveyId }) => {
    const [loading, setLoading] = useState(true);
    const [segments, setSegments] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [selectedQuestion, setSelectedQuestion] = useState('');
    const [selectedOption, setSelectedOption] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [segmentsRes, questionsRes] = await Promise.all([
                    AnalyticsService.getSegmentAnalysis(surveyId, 'domain'),
                    AnalyticsService.getQuestionAnalysis(surveyId)
                ]);

                if (segmentsRes.data?.success) {
                    setSegments(segmentsRes.data.data);
                }
                if (questionsRes.data?.success) {
                    // Filter only choice questions for segmentation
                    const choiceQuestions = questionsRes.data.data.filter(q =>
                        ['single_choice', 'multiple_choice', 'dropdown'].includes(q.questionType)
                    );
                    setQuestions(choiceQuestions);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [surveyId]);

    const handleFilterChange = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await AnalyticsService.getSegmentAnalysis(
                surveyId,
                'domain',
                selectedQuestion,
                selectedOption
            );
            if (response.data?.success) {
                setSegments(response.data.data);
            }
        } catch (error) {
            console.error('Failed to filter segments:', error);
        } finally {
            setLoading(false);
        }
    }, [surveyId, selectedQuestion, selectedOption]);

    // Trigger filter when option changes
    useEffect(() => {
        if (selectedQuestion && selectedOption) {
            handleFilterChange();
        } else if (!selectedQuestion && !selectedOption) {
            // Reset to default if cleared
            const reset = async () => {
                const response = await AnalyticsService.getSegmentAnalysis(surveyId, 'domain');
                if (response.data?.success) setSegments(response.data.data);
            };
            reset();
        }
    }, [selectedOption, selectedQuestion, handleFilterChange, surveyId]);

    const getOptionsForQuestion = (qId) => {
        const question = questions.find(q => q.questionId === parseInt(qId));
        if (!question) return [];
        // Extract options from stats.counts keys (e.g. "opt_123" or "Yes")
        // Note: Ideally backend should return structured options, but we can parse keys for now
        // or better, rely on the question definition if available. 
        // Since getQuestionAnalysis returns stats, we use the keys from there which represent ACTUAL answers.
        return Object.keys(question.stats.counts || {});
    };

    if (loading && segments.length === 0) return <Loader />;

    return (
        <div className={styles.tabContent}>
            <div className={styles.headerRow}>
                <h3>Segment Analysis (by Email Domain)</h3>

                <div className={styles.filterControls}>
                    <select
                        value={selectedQuestion}
                        onChange={(e) => {
                            setSelectedQuestion(e.target.value);
                            setSelectedOption(''); // Reset option when question changes
                        }}
                        className={styles.selectInput}
                    >
                        <option value="">-- Filter by Question --</option>
                        {questions.map(q => (
                            <option key={q.questionId} value={q.questionId}>
                                {q.questionText.length > 30 ? q.questionText.substring(0, 30) + '...' : q.questionText}
                            </option>
                        ))}
                    </select>

                    {selectedQuestion && (
                        <select
                            value={selectedOption}
                            onChange={(e) => setSelectedOption(e.target.value)}
                            className={styles.selectInput}
                        >
                            <option value="">-- Select Answer --</option>
                            {getOptionsForQuestion(selectedQuestion).map(opt => (
                                <option key={opt} value={opt.replace('opt_', '')}>
                                    {opt.startsWith('opt_') ? `Option ${opt.replace('opt_', '')}` : opt}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.dataTable}>
                    <thead>
                        <tr>
                            <th>Segment</th>
                            <th>Total Responses</th>
                            <th>Completion Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        {segments.length > 0 ? (
                            segments.map((seg, index) => (
                                <tr key={index}>
                                    <td>{seg.segment}</td>
                                    <td>{seg.totalResponses}</td>
                                    <td>{seg.completionRate}%</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center' }}>No data matches this filter</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SegmentsTab;
