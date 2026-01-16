import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { useToast } from '../../contexts/ToastContext';
import LLMService from '../../api/services/llm.service';
import styles from './SurveyActions.module.scss';

const SurveyActions = ({ survey, onClose, onEditSurvey }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [previewStates, setPreviewStates] = useState({});

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const result = await LLMService.exportSurveyPDF(survey.survey.id);

      if (result.success) {
        showToast(result.message, 'success');
      } else {
        throw new Error(result.message || 'Export failed');
      }
    } catch (error) {
      console.error('PDF Export Error:', error);
      showToast(error.response?.data?.message || error.message || 'An error occurred while exporting PDF', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePreview = (questionIndex) => {
    setPreviewStates(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  const getQuestionTypeLabel = (type) => {
    const typeMap = {
      'text': 'Text',
      'multiple_choice': 'Multiple Choice',
      'yes_no': 'Yes/No',
      'rating': 'Rating',
      'date': 'Date',
      'email': 'Email'
    };
    return typeMap[type] || type;
  };

  const renderPreview = (type) => {
    switch (type) {
      case 'text':
        return (
          <div className={styles.previewContainer}>
            <textarea
              className={styles.previewTextarea}
              placeholder="User's text response will appear here..."
              disabled
            />
          </div>
        );
      case 'yes_no':
        return (
          <div className={styles.previewContainer}>
            <div className={styles.previewRadio}>
              <input type="radio" disabled /> <span>Yes</span>
            </div>
            <div className={styles.previewRadio}>
              <input type="radio" disabled /> <span>No</span>
            </div>
          </div>
        );
      case 'rating':
        return (
          <div className={styles.previewContainer}>
            <div className={styles.previewRating}>
              {[1, 2, 3, 4, 5].map(num => (
                <span key={num} className={styles.ratingNumber}>{num}</span>
              ))}
            </div>
          </div>
        );
      case 'multiple_choice':
        return (
          <div className={styles.previewContainer}>
            <div className={styles.previewRadio}>
              <input type="radio" disabled /> <span>Option 1</span>
            </div>
            <div className={styles.previewRadio}>
              <input type="radio" disabled /> <span>Option 2</span>
            </div>
            <div className={styles.previewRadio}>
              <input type="radio" disabled /> <span>Option 3</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const totalQuestions = survey.totalQuestions || survey.questions?.length || 0;
  const createdDate = formatDate(survey.survey.created_at);
  const status = survey.survey.status || 'draft';

  return (
    <div className={styles.surveyActions}>
      {/* Survey Summary */}
      <Card className={styles.summaryCard}>
        <h3 className={styles.summaryTitle}>Survey Summary</h3>
        <h2 className={styles.surveyTitle}>{survey.survey.title}</h2>
        <p className={styles.surveyDescription}>
          {survey.survey.description || 'No description provided'}
        </p>
        <div className={styles.surveyMeta}>
          <span>{totalQuestions} question{totalQuestions !== 1 ? 's' : ''}</span>
          <span className={styles.metaSeparator}>•</span>
          <span>Created on {createdDate}</span>
          <span className={styles.metaSeparator}>•</span>
          <span>Status: {status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
      </Card>

      {/* Survey Readiness */}
      <div className={styles.readinessSection}>
        <p className={styles.readinessText}>All questions are valid</p>
        <p className={styles.readinessText}>Survey is ready to be shared</p>
      </div>

      {/* Questions List */}
      <Card className={styles.questionsCard}>
        <h4 className={styles.questionsHeader}>Questions in This Survey</h4>
        <div className={styles.questionsList}>
          {(survey.questions || []).map((question, index) => {
            const questionText = question.question_text || question.text || String(question);
            const questionType = question.question_type || question.type || question.QuestionType?.type_name || 'text';
            const showPreview = previewStates[index];

            return (
              <div key={question.id || index} className={styles.questionItem}>
                <div className={styles.questionRow}>
                  <span className={styles.questionNumber}>{index + 1}.</span>
                  <div className={styles.questionContent}>
                    <p className={styles.questionText}>{questionText}</p>
                    <div className={styles.questionMeta}>
                      <span className={styles.questionType}>{getQuestionTypeLabel(questionType)}</span>
                      <button
                        className={styles.previewButton}
                        onClick={() => togglePreview(index)}
                      >
                        {showPreview ? 'Hide preview' : 'Preview response format'}
                      </button>
                    </div>
                  </div>
                </div>

                {showPreview && renderPreview(questionType)}
              </div>
            );
          })}
        </div>

        {/* Export PDF - Secondary Action */}
        <div className={styles.exportSection}>
          <Button
            onClick={handleExportPDF}
            loading={loading}
            variant="outline"
            className={styles.exportButton}
          >
            Download as PDF
          </Button>
        </div>
      </Card>

      {/* Primary and Secondary Actions */}
      <div className={styles.actionsArea}>
        <div className={styles.secondaryActions}>
          <Button
            onClick={() => navigate('/surveys')}
            variant="outline"
          >
            Back to Surveys
          </Button>
          <Button
            onClick={() => navigate(`/collectors?survey=${survey.survey.id}`)}
            variant="outline"
          >
            Go to Collectors
          </Button>
        </div>
        <div className={styles.primaryAction}>
          <Button
            onClick={() => navigate(`/surveys/${survey.survey.id}/edit`)}
            className={styles.editButton}
          >
            Edit Survey
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SurveyActions;