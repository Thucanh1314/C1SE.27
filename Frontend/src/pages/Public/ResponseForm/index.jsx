import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import ResponseService from '../../../api/services/response.service';
import InviteService from '../../../api/services/invite.service';
import Loader from '../../../components/common/Loader/Loader';
import FeedbackForm from '../../../components/Surveys/FeedbackForm';
import { useNotificationTriggers } from '../../../components/Notifications';
import Button from '../../../components/UI/Button';
import styles from './ResponseForm.module.scss';

const PublicResponseForm = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite_token');
  const notificationTriggers = useNotificationTriggers();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [survey, setSurvey] = useState(null);
  // const [collectorId, setCollectorId] = useState(null); // Unused
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedResponseId, setSubmittedResponseId] = useState(null);
  const sessionStartedRef = React.useRef(false);
  const [error, setError] = useState(null);

  const fetchSurvey = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ResponseService.getSurveyByToken(token);

      if (!response.ok) {
        setError(response.message || 'Invalid or inactive survey link');
        return;
      }

      const surveyData = response.data.survey;

      // Check if this is a private survey
      if (surveyData.access_type === 'private') {
        // Private surveys REQUIRE invite token
        if (!inviteToken) {
          setError('This is a private survey. You need an invitation to access it. Please use the invitation link sent to your email.');
          setLoading(false);
          return;
        }

        // Validate the invite token
        try {
          const inviteValidation = await InviteService.validateToken(inviteToken);
          if (!inviteValidation || !inviteValidation.valid) {
            setError('Invalid or expired invitation. Please request a new invitation from the survey creator.');
            setLoading(false);
            return;
          }

          // Verify invite is for this survey
          if (inviteValidation.survey && inviteValidation.survey.id !== surveyData.id) {
            setError('This invitation is not valid for this survey.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Token validation error:', err);
          setError(err.response?.data?.message || 'Invalid or expired invitation.');
          setLoading(false);
          return;
        }


      }

      setSurvey(surveyData);
      // setCollectorId(response.data.collector_id);

      // Initialize answers based on question type
      const initialAnswers = {};
      surveyData.questions.forEach(q => {
        // Checkbox needs array, others need empty string or null
        if (q.type === 'checkbox' || q.type === 'multiple_choice') {
          initialAnswers[q.id] = [];
        } else {
          initialAnswers[q.id] = '';
        }
      });
      setAnswers(initialAnswers);

      // IDEMPOTENCY: Generate client response ID immediately, but DO NOT start session on backend yet
      // Use TOKEN in key to scope session to this specific link/collector
      const storageKey = `survey_client_response_${token}`;
      let clientResponseId = localStorage.getItem(storageKey);

      if (!clientResponseId) {
        // Generate UUID v4 for both public and private surveys
        clientResponseId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = Math.random() * 16 | 0;
          var v = c === 'x' ? r : ((r & 0x3) | 0x8);
          return v.toString(16);
        });
        localStorage.setItem(storageKey, clientResponseId);
        localStorage.setItem(storageKey, clientResponseId);
      }

      // START SESSION (Frontend-driven timing)
      // Only start if not already started in this component instance
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        // Fire and forget (don't block UI)
        ResponseService.startSession(
          surveyData.id,
          token, // collector token
          localStorage.getItem(`survey_session_${token}`), // session_id (optional)
          clientResponseId
        ).then(res => {
          console.log('[ResponseForm] Session started:', res);
        }).catch(err => {
          console.error('[ResponseForm] Failed to start session:', err);
        });
      }
    } catch (err) {
      console.error('Error fetching survey:', err);
      setError(err.response?.data?.message || 'Failed to load survey');
    } finally {
      setLoading(false);
    }
  }, [token, inviteToken]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!survey || survey.questions.length === 0) return 0;

    const answeredQuestions = survey.questions.filter(q => {
      const answer = answers[q.id];
      return answer && (Array.isArray(answer) ? answer.length > 0 : answer.toString().trim() !== '');
    });

    return Math.round((answeredQuestions.length / survey.questions.length) * 100);
  };

  // Estimate completion time (Unused)
  // const getEstimatedTime = () => {
  //   if (!survey) return '5-10 min';
  //   const questionCount = survey.questions.length;
  //   const timePerQuestion = 45; // seconds per question
  //   const totalSeconds = questionCount * timePerQuestion;
  //   const minutes = Math.ceil(totalSeconds / 60);
  //   return `${minutes} min`;
  // };

  // Get question type display name with details
  const getQuestionTypeDisplay = (question) => {
    const typeMap = {
      'open_ended': 'Text Response (Long)',
      'text': 'Text Response (Short)',
      'single_choice': 'Single Choice',
      'multiple_choice': 'Multiple Choice (Checkbox)',
      'checkbox': 'Multiple Choice (Checkbox)',
      'dropdown': 'Dropdown',
      'rating': 'Rating Scale',
      'boolean': 'Yes/No',
      'number': 'Number',
      'email': 'Email',
      'date': 'Date',
      'likert_scale': 'Likert Scale'
    };

    const baseType = typeMap[question.type] || 'Response';

    // Add option count for relevant types
    if (['multiple_choice', 'checkbox', 'dropdown'].includes(question.type) && question.options) {
      return `${baseType} (${question.options.length} options)`;
    }

    return baseType;
  };

  const validateAnswers = () => {
    const newErrors = {};

    survey.questions.forEach(question => {
      if (question.required) {
        const answer = answers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0)) {
          newErrors[question.id] = 'This question is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAnswerChange = (questionId, value, questionType) => {
    // For checkbox / multiple_choice type - handle multiple selections
    if (questionType === 'checkbox' || questionType === 'multiple_choice') {
      const currentAnswers = answers[questionId] || [];
      const newAnswers = currentAnswers.includes(value)
        ? currentAnswers.filter(v => v !== value)
        : [...currentAnswers, value];
      setAnswers({ ...answers, [questionId]: newAnswers });
    } else {
      // For all other types - single value
      setAnswers({ ...answers, [questionId]: value });
    }

    // Clear error when user interacts
    if (errors[questionId]) {
      setErrors({ ...errors, [questionId]: null });
    }
  };



  // Removed unused warning modal state variables

  // Removed unused functions for incomplete warning modal functionality

  const submitResponse = async () => {
    try {
      setSubmitting(true);

      // Format answers for submission
      const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
        questionId: parseInt(questionId),
        value: Array.isArray(value) ? value : String(value)
      }));

      const submissionData = {
        answers: formattedAnswers,
        response_id: submittedResponseId,
        session_id: localStorage.getItem(`survey_session_${token}`), // Legacy session ID (optional)
        client_response_id: localStorage.getItem(`survey_client_response_${token}`) // CRITICAL: Idempotency Key
      };

      // Include invite token if this is a private survey
      if (survey.access_type === 'private' && inviteToken) {
        submissionData.invite_token = inviteToken;
      }

      console.log('Submission data:', submissionData);

      const response = await ResponseService.submitPublicResponse(token, submissionData);

      if (response && response.success) { // Check for success flag from backend
        setSubmitted(true);

        // Send survey response notification
        if (survey?.workspace_id) {
          await notificationTriggers.sendSurveyResponseNotification(
            survey.id,
            response.data?.response_id,
            survey.workspace_id
          );
        }

        // CLEANUP: Remove local storage keys to allow fresh start next time (if revisited)
        localStorage.removeItem(`survey_client_response_${token}`);
        localStorage.removeItem(`survey_session_${token}`);

        // data structure: { success: true, data: { response_id: 123 } }
        if (response.data && response.data.response_id) {
          setSubmittedResponseId(response.data.response_id);
        }
      } else {
        setError(response.message || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      setError(error.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return; // Guard against double-submit

    if (!validateAnswers()) {
      // If validation fails (required questions missing), auto-scroll to first error
      const requiredQ = survey.questions.find(q => q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)));
      if (requiredQ) {
        const el = document.getElementById(`question-${requiredQ.id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Proceed to submit if no skips
    await submitResponse();
  };

  const renderQuestion = (question, index) => {
    const answer = answers[question.id];
    const hasError = errors[question.id];

    return (
      <div key={question.id} className={styles.questionBlock}>
        <div className={styles.questionHeader}>
          <div className={styles.questionNumber}>
            {index + 1}
          </div>
          <div className={styles.questionContent}>
            <div className={styles.questionType}>
              {getQuestionTypeDisplay(question)}
            </div>
            <label className={styles.questionLabel}>
              {question.label}
              {question.required && (
                <span className={styles.requiredIndicator}>Required</span>
              )}
            </label>
            {question.description && (
              <div className={styles.questionDescription}>
                {question.description}
              </div>
            )}
          </div>
        </div>

        {/* Open Ended / Text - Text area or input */}
        {(question.type === 'open_ended' || question.type === 'text') && (
          <>
            {question.type === 'open_ended' ? (
              <textarea
                value={answer || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                className={`${styles.textarea} ${hasError ? styles.inputError : ''}`}
                placeholder="Your answer..."
                rows={4}
              />
            ) : (
              <input
                type="text"
                value={answer || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
                className={`${styles.input} ${hasError ? styles.inputError : ''}`}
                placeholder="Your answer..."
              />
            )}
          </>
        )}

        {/* Single Choice - Radio buttons */}
        {question.type === 'single_choice' && (
          <div className={styles.optionsList}>
            {(question.options || []).map((option) => (
              <label key={option.id} className={styles.optionLabel}>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option.id}
                  checked={String(answer) === String(option.id)}
                  onChange={(e) => handleAnswerChange(question.id, option.id, question.type)}
                  className={styles.radioInput}
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {/* Multiple Choice / Checkbox - Checkbox inputs */}
        {(question.type === 'multiple_choice' || question.type === 'checkbox') && (
          <div className={styles.optionsList}>
            {(question.options || []).map((option) => (
              <label key={option.id} className={styles.optionLabel}>
                <input
                  type="checkbox"
                  value={option.id}
                  checked={(answer || []).includes(option.id)}
                  onChange={(e) => handleAnswerChange(question.id, option.id, question.type)}
                  className={styles.checkboxInput}
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {/* Dropdown - Select single option */}
        {question.type === 'dropdown' && (
          <select
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
            className={`${styles.select} ${hasError ? styles.inputError : ''}`}
          >
            <option value="">-- Select an option --</option>
            {(question.options || []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.text}
              </option>
            ))}
          </select>
        )}

        {/* Likert Scale - Rating 1-5 */}
        {question.type === 'likert_scale' && (
          <div className={styles.ratingScale}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleAnswerChange(question.id, rating, question.type)}
                className={`${styles.ratingButton} ${String(answer) === String(rating) ? styles.ratingSelected : ''}`}
              >
                {rating}
              </button>
            ))}
          </div>
        )}

        {/* Rating - Numeric rating */}
        {question.type === 'rating' && (
          <div className={styles.ratingScale}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleAnswerChange(question.id, rating, question.type)}
                className={`${styles.ratingButton} ${String(answer) === String(rating) ? styles.ratingSelected : ''}`}
              >
                {rating}
              </button>
            ))}
          </div>
        )}

        {/* Boolean - Yes/No */}
        {question.type === 'boolean' && (
          <div className={styles.optionsList}>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name={`question-${question.id}`}
                value="true"
                checked={String(answer) === 'true'}
                onChange={() => handleAnswerChange(question.id, 'true', question.type)}
                className={styles.radioInput}
              />
              <span>Yes</span>
            </label>
            <label className={styles.optionLabel}>
              <input
                type="radio"
                name={`question-${question.id}`}
                value="false"
                checked={String(answer) === 'false'}
                onChange={() => handleAnswerChange(question.id, 'false', question.type)}
                className={styles.radioInput}
              />
              <span>No</span>
            </label>
          </div>
        )}

        {/* Number Input */}
        {question.type === 'number' && (
          <input
            type="number"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
            className={`${styles.input} ${hasError ? styles.inputError : ''}`}
            placeholder="Enter a number..."
          />
        )}

        {/* Email Input */}
        {question.type === 'email' && (
          <input
            type="email"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
            className={`${styles.input} ${hasError ? styles.inputError : ''}`}
            placeholder="your.email@example.com"
          />
        )}

        {/* Date Input */}
        {question.type === 'date' && (
          <input
            type="date"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value, question.type)}
            className={`${styles.input} ${hasError ? styles.inputError : ''}`}
          />
        )}

        {hasError && <div className={styles.errorMessage}>{hasError}</div>}
      </div>
    );
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorIcon}>❌</div>
        <h2>Survey Unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.successPage}>
        <div className={styles.successIcon}>✓</div>
        <h2>Thank you!</h2>
        <p>Your response has been submitted successfully.</p>
        <div className={styles.successDetails}>
          <p>We appreciate you taking the time to complete this survey.</p>
        </div>

        {submittedResponseId && survey && (
          <FeedbackForm
            surveyId={survey.id}
            responseId={submittedResponseId}
            onComplete={() => console.log('Feedback process completed')}
          />
        )}
      </div>
    );
  }

  if (!survey) {
    return null;
  }

  return (
    <div className={styles.publicResponse}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{survey.title}</h1>
          {survey.description && (
            <p className={styles.description}>{survey.description}</p>
          )}

          {/* Progress Bar */}
          <div className={styles.progressSection}>
            <div className={styles.progressLabel}>
              <div className={styles.progressText}>
                <span className={styles.progressIcon}>📊</span>
                Progress
              </div>
              <span className={styles.progressPercentage}>
                {calculateProgress()}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
          </div>

          {/* Survey Statistics */}
          <div className={styles.surveyStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{survey.questions.length}</span>
              <span className={styles.statLabel}>Total Questions</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {new Set(survey.questions.map(q => q.type)).size}
              </span>
              <span className={styles.statLabel}>Question Types</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{calculateProgress()}%</span>
              <span className={styles.statLabel}>Progress</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.questionsContainer}>
            {survey.questions
              .sort((a, b) => a.display_order - b.display_order)
              .map((question, index) => renderQuestion(question, index))}
          </div>

          <div className={styles.submitSection}>
            <Button
              type="submit"
              loading={submitting}
              size="lg"
            >
              Submit Response
            </Button>
          </div>
        </form>

        <div className={styles.footer}>
          <p>Powered by LLM Survey System</p>
        </div>
      </div>
    </div>
  );
};

export default PublicResponseForm;
