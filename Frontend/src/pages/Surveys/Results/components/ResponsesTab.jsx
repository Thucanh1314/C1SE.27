import React, { useState, useEffect } from 'react';
import ResponseService from '../../../../api/services/response.service';
import Loader from '../../../../components/common/Loader/Loader';
import styles from '../Results.module.scss';
import { useToast } from '../../../../contexts/ToastContext';

const ResponsesTab = ({ surveyId, survey }) => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [responses, setResponses] = useState([]);
    const [expandedResponse, setExpandedResponse] = useState(null);

    useEffect(() => {
        const fetchResponses = async () => {
            setLoading(true);
            try {
                const data = await ResponseService.getResponsesBySurvey(surveyId);
                const list = data?.responses || data?.data?.responses || [];
                setResponses(list);
            } catch (error) {
                console.error('Failed to load responses:', error);
                showToast('Failed to load responses', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchResponses();
    }, [surveyId, showToast]);

    const toggleResponse = (responseId) => {
        setExpandedResponse(expandedResponse === responseId ? null : responseId);
    };

    const formatAnswer = (value) => {
        if (value === null || value === undefined) return 'N/A';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    if (loading) return <Loader />;

    if (responses.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📭</div>
                <p>No responses yet</p>
            </div>
        );
    }

    return (
        <div className={styles.tabContent}>
            <h3>Individual Responses ({responses.length})</h3>
            <div className={styles.responsesList}>
                {responses.map((response, index) => {
                    const answersData = response.Answers || response.answers || [];
                    const answers = typeof answersData === 'string'
                        ? JSON.parse(answersData)
                        : answersData;
                    const isExpanded = expandedResponse === response.id;

                    return (
                        <div key={response.id} className={styles.responseCard}>
                            <div
                                className={styles.responseHeader}
                                onClick={() => toggleResponse(response.id)}
                            >
                                <div className={styles.responseInfo}>
                                    <span className={styles.responseNumber}>
                                        {response.User ? (
                                            <>
                                                {response.User.full_name || response.User.username}
                                                {response.User.email && (
                                                    <span className={styles.respondentEmail}> ({response.User.email})</span>
                                                )}
                                            </>
                                        ) : (
                                            `Response #${responses.length - index}`
                                        )}
                                    </span>
                                    <span className={styles.responseDate}>
                                        {new Date(response.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className={isExpanded ? styles.iconExpanded : ''}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </div>

                            {isExpanded && (
                                <div className={styles.responseContent}>
                                    {Array.isArray(answers) && answers.map((answer, idx) => {
                                        const qId = parseInt(answer.question_id || answer.questionId);
                                        let val = answer.text_answer;
                                        if (val === null || val === undefined) val = answer.numeric_answer;
                                        if (val === null || val === undefined) val = answer.value;
                                        if ((val === null || val === undefined) && answer.QuestionOption) val = answer.QuestionOption.option_text;
                                        if (val === null || val === undefined) val = answer.option_id;

                                        let label = answer.Question?.label || answer.Question?.question_text;
                                        if (!label && survey?.template?.Questions) {
                                            const question = survey.template.Questions.find(q => q.id === qId);
                                            label = question?.label || question?.question_text || `Question ${qId}`;
                                        }

                                        return (
                                            <div key={idx} className={styles.answerItem}>
                                                <div className={styles.answerQuestion}>
                                                    {label || `Question ${qId}`}
                                                </div>
                                                <div className={styles.answerValue}>
                                                    {formatAnswer(val)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ResponsesTab;
