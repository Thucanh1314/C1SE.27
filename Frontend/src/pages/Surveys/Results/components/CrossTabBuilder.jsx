import React, { useState } from 'react';
import AnalyticsService from '../../../../api/services/analytics.service';
import Loader from '../../../../components/common/Loader/Loader';
import styles from './Analytics.module.scss';

const CrossTabBuilder = ({ surveyId, questions }) => {
    const [filterQuestionId, setFilterQuestionId] = useState('');
    const [filterOptionId, setFilterOptionId] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);

    // Filter only choice questions for the "Filter By" dropdown
    const choiceQuestions = questions.filter(q =>
        ['single_choice', 'multiple_choice', 'dropdown'].includes(q.type)
    );

    const selectedQuestion = questions.find(q => q.id === parseInt(filterQuestionId));

    const handleAnalyze = async () => {
        if (!filterQuestionId || !filterOptionId) return;

        try {
            setLoading(true);
            setError(null);
            const data = await AnalyticsService.getCrossTabAnalysis(surveyId, filterQuestionId, filterOptionId);
            setResults(data);
        } catch (err) {
            setError('Failed to load cross-tabulation data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3>Cross-Tabulation Analysis</h3>
                <p className={styles.cardSub}>Analyze how specific groups answered other questions.</p>
            </div>

            <div className={styles.controls}>
                <div className={styles.controlGroup}>
                    <label>Filter By Question:</label>
                    <select
                        value={filterQuestionId}
                        onChange={(e) => {
                            setFilterQuestionId(e.target.value);
                            setFilterOptionId('');
                            setResults(null);
                        }}
                        className={styles.select}
                    >
                        <option value="">Select a question...</option>
                        {choiceQuestions.map(q => (
                            <option key={q.id} value={q.id}>
                                {q.label || q.question_text || `Q${q.id}`}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedQuestion && (
                    <div className={styles.controlGroup}>
                        <label>Select Answer Option:</label>
                        <select
                            value={filterOptionId}
                            onChange={(e) => setFilterOptionId(e.target.value)}
                            className={styles.select}
                        >
                            <option value="">Select an answer...</option>
                            {selectedQuestion.options?.map(opt => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.text}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <button
                    onClick={handleAnalyze}
                    disabled={!filterQuestionId || !filterOptionId || loading}
                    className={styles.analyzeButton}
                >
                    {loading ? 'Analyzing...' : 'Analyze'}
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {results && (
                <div className={styles.resultsArea}>
                    <h4>Results for respondents who answered "{selectedQuestion?.options?.find(o => o.id === parseInt(filterOptionId))?.text}"</h4>

                    {results.length === 0 ? (
                        <p>No matching responses found.</p>
                    ) : (
                        <div className={styles.crossTabGrid}>
                            {/* Group results by question */}
                            {Object.values(results.reduce((acc, item) => {
                                if (!acc[item.question_id]) acc[item.question_id] = [];
                                acc[item.question_id].push(item);
                                return acc;
                            }, {})).map((group, idx) => (
                                <div key={idx} className={styles.resultItem}>
                                    <h5>{group[0].Question?.content || `Question ${group[0].question_id}`}</h5>
                                    <ul>
                                        {group.map((opt, i) => (
                                            <li key={i}>
                                                <span>{opt.QuestionOption?.content || 'Option'}</span>
                                                <strong>{opt.count}</strong>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CrossTabBuilder;
