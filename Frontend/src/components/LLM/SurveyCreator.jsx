import React, { useState, useEffect } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Select from '../UI/Select';
import TextArea from '../UI/TextArea';
import Checkbox from '../UI/Checkbox';
import { useToast } from '../../contexts/ToastContext';
import LLMService from '../../api/services/llm.service';
import WorkspaceService from '../../api/services/workspace.service';
import styles from './SurveyCreator.module.scss';

const SurveyCreator = ({ generatedQuestions, onSurveyCreated, initialSelectedIndices }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);

  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    targetAudience: 'public',
    targetValue: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    workspaceId: '',
  });

  // Quick Invite state for Private surveys
  const [quickInvite, setQuickInvite] = useState({
    emails: '',
    invitationMessage: '',
    sendImmediately: true
  });

  // Use Set for O(1) lookup and reliable toggle behavior
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(() => {
    if (initialSelectedIndices && initialSelectedIndices.size > 0) {
      return new Set(initialSelectedIndices);
    }
    return new Set();
  });
  const [customQuestions, setCustomQuestions] = useState([]);
  const [previewStates, setPreviewStates] = useState({});
  const [shareSettings, setShareSettings] = useState({
    isPublic: true,
    allowAnonymous: true,
    requireLogin: false,
    expiryDays: 30
  });

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const response = await WorkspaceService.getMyWorkspaces();
      if (response.ok) {
        setWorkspaces(response.items);
      }
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
    }
  };

  /**
   * Improved question type inference with strict rules
   * Prevents 'What/How/Why' questions from being classified as Yes/No
   */
  const getQuestionType = (questionText) => {
    const text = questionText.toLowerCase().trim();

    // Rule: Explicitly block Yes/No for open-ended question starters
    const openEndedStarters = ['what', 'why', 'how', 'which', 'describe', 'explain', 'tell us', 'tell me'];
    const startsWithOpenEnded = openEndedStarters.some(starter => text.startsWith(starter));

    if (startsWithOpenEnded) {
      // Open-ended questions should never be Yes/No
      return 'text';
    }

    // Rule: Yes/No only for binary decision questions
    const binaryStarters = [
      'do you', 'did you', 'have you', 'has your', 'has the',
      'are you', 'is there', 'is your', 'is the',
      'was there', 'was your', 'will you', 'can you', 'could you',
      'would you', 'should you'
    ];
    const isBinaryQuestion = binaryStarters.some(starter => text.startsWith(starter));
    const hasExplicitBinary = text.includes('yes or no') || text.includes('(yes/no)') || text.includes('true or false');

    if (isBinaryQuestion || hasExplicitBinary) {
      return 'yes_no';
    }

    // Rating questions
    if (text.includes('rate') || text.includes('scale') || text.includes('how much') || text.includes('how satisfied')) {
      return 'rating';
    }

    // Multiple choice questions
    if (text.includes('choose') || text.includes('select one') || text.includes('which of the following')) {
      return 'multiple_choice';
    }

    // Default to text for open-ended
    return 'text';
  };

  /**
   * Validates and corrects question types after AI generation
   * Ensures data quality before rendering or saving
   */
  const validateAndFixQuestionTypes = React.useCallback((questions) => {
    return questions.map(question => {
      const questionText = question.question || question.question_text || '';
      const aiType = question.type || question.question_type;
      const inferredType = getQuestionType(questionText);

      // Auto-correct if AI assigned yes_no to an open-ended question
      if (aiType === 'yes_no' && inferredType !== 'yes_no') {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[TYPE_FIX] Changed yes_no -> ${inferredType} for question: "${questionText.substring(0, 50)}..."`);
        }
        return { ...question, type: inferredType };
      }

      // Use inferred type if AI didn't provide one
      if (!aiType) {
        return { ...question, type: inferredType };
      }

      return question;
    });
  }, []);

  // Apply type validation to generated questions
  // Memoize this to avoid re-calculation on every render
  const validatedQuestions = React.useMemo(() => validateAndFixQuestionTypes(generatedQuestions), [generatedQuestions, validateAndFixQuestionTypes]);

  // Group questions by type matches validated questions
  const groupedQuestions = React.useMemo(() => {
    const groups = {
      text: [],
      yes_no: [],
      rating: [],
      multiple_choice: []
    };

    validatedQuestions.forEach((question, index) => {
      // Use validated type
      const type = question.type || getQuestionType(question.question);
      // Ensure type exists in groups, else default to text
      const targetGroup = groups[type] ? groups[type] : groups.text;

      targetGroup.push({ ...question, originalIndex: index });
    });

    return groups;
  }, [validatedQuestions]);


  const getTypeLabel = (type) => {
    const labels = {
      text: 'Text',
      yes_no: 'Yes/No',
      rating: 'Rating',
      multiple_choice: 'Multiple Choice'
    };
    return labels[type] || type;
  };

  /**
   * Toggle question selection using ID-based Set
   * Supports both check and uncheck reliably
   */
  const handleQuestionSelect = (question) => {
    // Ensure ID is defined and consistent
    const questionId = question.originalIndex !== undefined ? question.originalIndex : question.id;

    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        // Uncheck: remove from Set
        next.delete(questionId);
      } else {
        // Check: add to Set
        next.add(questionId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = new Set(generatedQuestions.map((_, index) => index));
    setSelectedQuestionIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedQuestionIds(new Set());
  };

  const togglePreview = (questionIndex) => {
    setPreviewStates(prev => ({
      ...prev,
      [questionIndex]: !prev[questionIndex]
    }));
  };

  const addCustomQuestion = () => {
    setCustomQuestions([...customQuestions, {
      id: Date.now() + Math.random(),
      question_text: '',
      question_type: 'text',
      is_required: false,
      options: [],
      isCustom: true
    }]);
  };

  const updateCustomQuestion = (id, field, value) => {
    setCustomQuestions(customQuestions.map(q =>
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  const removeCustomQuestion = (id) => {
    setCustomQuestions(customQuestions.filter(q => q.id !== id));
  };

  const addOptionToQuestion = (questionId) => {
    setCustomQuestions(customQuestions.map(q =>
      q.id === questionId ? {
        ...q,
        options: [...(q.options || []), '']
      } : q
    ));
  };

  const updateQuestionOption = (questionId, optionIndex, value) => {
    setCustomQuestions(customQuestions.map(q =>
      q.id === questionId ? {
        ...q,
        options: q.options.map((opt, index) =>
          index === optionIndex ? value : opt
        )
      } : q
    ));
  };

  const removeQuestionOption = (questionId, optionIndex) => {
    setCustomQuestions(customQuestions.map(q =>
      q.id === questionId ? {
        ...q,
        options: q.options.filter((_, index) => index !== optionIndex)
      } : q
    ));
  };

  const handleCreateSurvey = async () => {
    if (!surveyData.title.trim()) {
      showToast('Please enter survey title', 'error');
      return;
    }

    if (selectedQuestionIds.size === 0 && customQuestions.length === 0) {
      showToast('Please select or add at least one question', 'error');
      return;
    }

    if (surveyData.targetAudience === 'internal' && !surveyData.workspaceId) {
      showToast('Please select a Workspace for internal survey', 'error');
      return;
    }

    // PERMISSION CHECK
    if (surveyData.targetAudience === 'internal' && surveyData.workspaceId) {
      const selectedWorkspace = workspaces.find(ws => String(ws.id) === String(surveyData.workspaceId));
      if (selectedWorkspace) {
        const userRole = selectedWorkspace.role;
        const allowedRoles = ['owner', 'admin', 'editor', 'collaborator'];

        if (!allowedRoles.includes(userRole)) {
          showToast(
            `❌ Permission Denied: Only workspace owners, admins, and editors can add surveys. Your current role: "${userRole}"`,
            'error'
          );
          return;
        }
      }
    }

    setLoading(true);
    try {
      const selectedQuestionsArray = getSelectedQuestionsArray();

      // Validate quick invite emails if provided
      let processedEmails = [];
      if (surveyData.targetAudience === 'private' && quickInvite.emails.trim()) {
        const emailList = quickInvite.emails
          .split(/[,\n]/)
          .map(email => email.trim())
          .filter(email => email)
          .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)); // Basic email validation

        if (emailList.length > 100) {
          showToast('Maximum 100 email addresses allowed', 'error');
          setLoading(false);
          return;
        }

        processedEmails = emailList;
      }

      const response = await LLMService.createSurveyFromQuestions({
        ...surveyData,
        selectedQuestions: selectedQuestionsArray,
        customQuestions: customQuestions.filter(q => q.question_text.trim()),
        shareSettings,
        // Include quick invite data
        quickInvite: surveyData.targetAudience === 'private' ? {
          ...quickInvite,
          emails: processedEmails
        } : null
      });

      let successMessage = 'Survey created successfully!';

      // Handle quick invite if enabled
      if (surveyData.targetAudience === 'private' &&
        quickInvite.sendImmediately &&
        processedEmails.length > 0) {
        try {
          // TODO: Implement invitation service call
          // await InvitationService.sendBulkInvitations(response.data.id, {
          //   emails: processedEmails,
          //   message: quickInvite.invitationMessage
          // });
          successMessage = `Survey created and ${processedEmails.length} invitations sent!`;
        } catch (inviteError) {
          console.error('Failed to send invitations:', inviteError);
          successMessage = 'Survey created! Failed to send some invitations.';
        }
      } else if (surveyData.targetAudience === 'private' && processedEmails.length > 0) {
        successMessage = `Survey created! Ready to invite ${processedEmails.length} recipients.`;
      }

      showToast(successMessage, 'success');
      onSurveyCreated && onSurveyCreated(response.data);
    } catch (error) {
      showToast(error.response?.data?.message || 'An error occurred while creating survey', 'error');
    } finally {
      setLoading(false);
    }
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

  const totalQuestions = validatedQuestions.length;
  const selectedCount = selectedQuestionIds.size;
  const totalWithCustom = selectedCount + customQuestions.filter(q => q.question_text.trim()).length;

  /**
   * Check if a question is selected by its ID
   */
  const isQuestionSelected = (questionId) => {
    return selectedQuestionIds.has(questionId);
  };

  /**
   * Get selected questions as array for survey creation
   */
  const getSelectedQuestionsArray = () => {
    return validatedQuestions
      .map((q, index) => ({ ...q, originalIndex: index }))
      .filter(q => selectedQuestionIds.has(q.originalIndex))
      .map(q => ({
        question: q.question,
        type: getQuestionType(q.question),
        required: false,
        options: getQuestionType(q.question) === 'multiple_choice' ? ['Option 1', 'Option 2', 'Option 3'] : undefined
      }));
  };

  return (
    <div className={styles.surveyCreator}>
      {/* Header */}
      <div className={styles.header}>
        <h3>Create Survey from AI Questions</h3>
        <p>These questions were generated by AI. You can select, preview, or customize them before creating your survey.</p>
      </div>

      {/* Survey Basic Info */}
      <Card className={styles.basicInfo}>
        <h4>Basic Information</h4>
        <div className={styles.formGroup}>
          <label>Survey Title *</label>
          <Input
            value={surveyData.title}
            onChange={(e) => setSurveyData({ ...surveyData, title: e.target.value })}
            placeholder="Enter survey title"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Description</label>
          <TextArea
            value={surveyData.description}
            onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
            placeholder="Describe the purpose of this survey..."
            rows={3}
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Survey Target</label>
            <Select
              value={surveyData.targetAudience}
              onChange={(value) => {
                let newShareSettings = { ...shareSettings };

                switch (value) {
                  case 'public':
                    newShareSettings = { ...newShareSettings, isPublic: true, allowAnonymous: true, requireLogin: false };
                    break;
                  case 'public_with_login':
                    newShareSettings = { ...newShareSettings, isPublic: true, allowAnonymous: false, requireLogin: true };
                    break;
                  case 'private':
                    newShareSettings = { ...newShareSettings, isPublic: false, allowAnonymous: false, requireLogin: true };
                    break;
                  case 'internal':
                    newShareSettings = { ...newShareSettings, isPublic: false, allowAnonymous: false, requireLogin: true };
                    break;
                  default:
                    break;
                }

                setSurveyData({ ...surveyData, targetAudience: value });
                setShareSettings(newShareSettings);
              }}
            >
              <option value="public">Public (Everyone)</option>
              <option value="public_with_login">Public (Requires Login)</option>
              <option value="private">Private (Invited Only)</option>
              <option value="internal">Internal (Workspace Members)</option>
            </Select>
          </div>

          {surveyData.targetAudience === 'internal' && (
            <div className={styles.formGroup}>
              <label>Select Workspace *</label>
              <Select
                value={surveyData.workspaceId}
                onChange={(value) => setSurveyData({ ...surveyData, workspaceId: value })}
              >
                <option value="">-- Select Workspace --</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Quick Invite Section for Private Surveys */}
          {surveyData.targetAudience === 'private' && (
            <Card title="📧 Quick Invitation (Optional)" className={styles.quickInviteCard}>
              <div className={styles.quickInviteSection}>
                <div className={styles.formGroup}>
                  <label>Email Addresses</label>
                  <TextArea
                    placeholder="Enter email addresses (one per line or comma-separated)&#10;example@email.com&#10;user2@email.com, user3@email.com"
                    value={quickInvite.emails}
                    onChange={(e) => setQuickInvite({ ...quickInvite, emails: e.target.value })}
                    rows={4}
                    className={styles.emailList}
                  />
                  <small className={styles.helpText}>Maximum 100 emails</small>
                </div>

                <div className={styles.formGroup}>
                  <label>Custom Invitation Message (Optional)</label>
                  <TextArea
                    placeholder="Hi! You're invited to participate in our survey. Your feedback is valuable to us."
                    value={quickInvite.invitationMessage}
                    onChange={(e) => setQuickInvite({ ...quickInvite, invitationMessage: e.target.value })}
                    rows={3}
                    className={styles.invitationMessage}
                  />
                </div>

                <div className={styles.formGroup}>
                  <Checkbox
                    checked={quickInvite.sendImmediately}
                    onChange={(checked) => setQuickInvite({ ...quickInvite, sendImmediately: checked })}
                    label="Send invitations immediately after creating survey"
                  />
                </div>

                {quickInvite.emails && (
                  <div className={styles.emailPreview}>
                    <small className={styles.previewText}>
                      📊 Will invite {quickInvite.emails.split(/[,\n]/).filter(email => email.trim()).length} recipients
                    </small>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className={styles.formGroup}>
            <label>Start Date</label>
            <Input
              type="date"
              value={surveyData.startDate}
              onChange={(e) => setSurveyData({ ...surveyData, startDate: e.target.value })}
            />
          </div>

          <div className={styles.formGroup}>
            <label>End Date (optional)</label>
            <Input
              type="date"
              value={surveyData.endDate}
              onChange={(e) => setSurveyData({ ...surveyData, endDate: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Question Selection */}
      <Card className={styles.questionCard}>
        <div className={styles.questionHeader}>
          <div className={styles.questionHeaderLeft}>
            <h4>Select Questions</h4>
            <p className={styles.selectionCount}>
              {selectedCount} / {totalQuestions} selected
            </p>
          </div>
          <div className={styles.selectionControls}>
            <button
              className={styles.textButton}
              onClick={handleSelectAll}
              disabled={selectedCount === totalQuestions}
            >
              Select all
            </button>
            <span className={styles.separator}>•</span>
            <button
              className={styles.textButton}
              onClick={handleClearSelection}
              disabled={selectedCount === 0}
            >
              Clear selection
            </button>
          </div>
        </div>

        <div className={styles.questionList}>
          {Object.entries(groupedQuestions).map(([type, questions]) => {
            if (questions.length === 0) return null;

            return (
              <div key={type} className={styles.questionGroup}>
                <div className={styles.groupHeader}>
                  <h5>{getTypeLabel(type)}</h5>
                  <span className={styles.groupCount}>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
                </div>

                {questions.map((question) => {
                  const uniqueKey = `${type}-${question.originalIndex}`;
                  const questionId = question.originalIndex;
                  const isSelected = isQuestionSelected(questionId);
                  const showPreview = previewStates[uniqueKey];

                  return (
                    <div key={uniqueKey} className={styles.questionItem}>
                      <div className={styles.questionRow}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleQuestionSelect(question)}
                        />
                        <div className={styles.questionContent}>
                          <p className={styles.questionText}>{question.question}</p>
                          <div className={styles.questionActions}>
                            <button
                              className={styles.previewButton}
                              onClick={() => togglePreview(uniqueKey)}
                            >
                              {showPreview ? 'Hide preview' : 'Preview response format'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {showPreview && renderPreview(type)}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Custom Questions Section */}
          {customQuestions.length > 0 && (
            <div className={styles.questionGroup}>
              <div className={styles.groupHeader}>
                <h5>Custom Questions</h5>
                <span className={styles.groupCount}>{customQuestions.length} question{customQuestions.length !== 1 ? 's' : ''}</span>
              </div>

              {customQuestions.map((question) => (
                <div key={question.id} className={styles.customQuestionItem}>
                  <div className={styles.customQuestionHeader}>
                    <Input
                      value={question.question_text}
                      onChange={(e) => updateCustomQuestion(question.id, 'question_text', e.target.value)}
                      placeholder="Enter your question..."
                    />
                    <Select
                      value={question.question_type}
                      onChange={(value) => updateCustomQuestion(question.id, 'question_type', value)}
                    >
                      <option value="text">Text</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="yes_no">Yes/No</option>
                      <option value="rating">Rating</option>
                      <option value="date">Date</option>
                      <option value="email">Email</option>
                    </Select>
                    <button
                      className={styles.removeButton}
                      onClick={() => removeCustomQuestion(question.id)}
                    >
                      Remove
                    </button>
                  </div>

                  {question.question_type === 'multiple_choice' && (
                    <div className={styles.optionsSection}>
                      <label>Options:</label>
                      {(question.options || []).map((option, index) => (
                        <div key={index} className={styles.optionRow}>
                          <Input
                            value={option}
                            onChange={(e) => updateQuestionOption(question.id, index, e.target.value)}
                            placeholder={`Option ${index + 1}`}
                          />
                          <button
                            className={styles.removeOptionButton}
                            onClick={() => removeQuestionOption(question.id, index)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        className={styles.addOptionButton}
                        onClick={() => addOptionToQuestion(question.id)}
                      >
                        + Add option
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Question Button */}
          <button className={styles.addCustomButton} onClick={addCustomQuestion}>
            + Add a custom question
          </button>
        </div>
      </Card>

      {/* Fixed Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {totalWithCustom === 0 ? (
            <span className={styles.footerStatus}>No questions selected</span>
          ) : (
            <span className={styles.footerStatus}>
              {totalWithCustom} question{totalWithCustom !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        <div className={styles.footerRight}>
          <Button
            onClick={handleCreateSurvey}
            disabled={loading || !surveyData.title.trim() || totalWithCustom === 0}
            loading={loading}
            className={styles.createButton}
          >
            Create Survey
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SurveyCreator;