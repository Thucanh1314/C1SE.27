import React from 'react';
import PropTypes from 'prop-types';
import OptionList from '../OptionList';
import styles from './QuestionCard.module.scss';
import { getQuestionTypeLabel, getQuestionType } from '../../../utils/questionTypes';

/**
 * QuestionCard Component
 * Renders a question with its options/input field based on question type
 * @param {Object} question - Question object {id, label, question_text, question_type, is_required}
 * @param {Array} options - Array of options for MCQ/Checkbox/Dropdown
 * @param {boolean} editable - Show edit/delete actions
 * @param {Function} onEdit - Callback for editing question
 * @param {Function} onDelete - Callback for deleting question
 * @param {Function} onEditOption - Callback for editing option
 * @param {Function} onDeleteOption - Callback for deleting option
 * @param {Function} onAddOption - Callback for adding option
 * @param {number} index - Question number for display
 */
const QuestionCard = ({
  question,
  options = [],
  editable = false,
  onEdit,
  onDelete,
  onEditOption,
  onDeleteOption,
  onAddOption,
  index,
}) => {
  const renderQuestionInput = () => {
    const questionType = getQuestionType(question);
    switch (questionType) {
      case 'multiple_choice':
      case 'checkbox':
      case 'dropdown':
        return (
          <OptionList
            options={options}
            questionType={questionType}
            editable={editable}
            onEdit={onEditOption}
            onDelete={onDeleteOption}
            onAdd={onAddOption}
          />
        );

      case 'likert_scale':
        return (
          <div className={styles.likertScale}>
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className={styles.likertOption}>
                <input type="radio" name={`likert-${question.id}`} disabled />
                <span>{value}</span>
              </label>
            ))}
          </div>
        );

      case 'open_ended':
        return (
          <textarea
            className={styles.openEndedInput}
            placeholder="Type your answer here..."
            rows={4}
            disabled
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.questionCard}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          {index !== undefined && (
            <span className={styles.questionNumber}>{index + 1}.</span>
          )}
          <div>
            <h3 className={styles.questionText}>
              {question.label || question.question_text || 'Untitled question'}
              {question.is_required && (
                <span className={styles.required}>*</span>
              )}
            </h3>
            <span className={styles.questionType}>
              {getQuestionTypeLabel(question)}
            </span>
          </div>
        </div>

        {editable && (
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => onEdit?.(question)}
              className={styles.editButton}
              title="Edit question"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(question.id)}
              className={styles.deleteButton}
              title="Delete question"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className={styles.content}>
        {renderQuestionInput()}
      </div>
    </div>
  );
};

QuestionCard.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.number,
    label: PropTypes.string, // Primary field
    question_text: PropTypes.string, // Fallback field
    question_type: PropTypes.string.isRequired,
    is_required: PropTypes.bool,
  }).isRequired,
  options: PropTypes.array,
  editable: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onEditOption: PropTypes.func,
  onDeleteOption: PropTypes.func,
  onAddOption: PropTypes.func,
  index: PropTypes.number,
};

export default QuestionCard;
