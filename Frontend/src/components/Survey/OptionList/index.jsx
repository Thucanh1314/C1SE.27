import React from 'react';
import PropTypes from 'prop-types';
import styles from './OptionList.module.scss';

/**
 * OptionList Component
 * Displays options for multiple choice, checkbox, dropdown questions
 * @param {Array} options - Array of option objects {id, option_text, display_order}
 * @param {string} questionType - Type of question (multiple_choice, checkbox, dropdown)
 * @param {boolean} editable - Show edit/delete actions
 * @param {Function} onEdit - Callback for editing option
 * @param {Function} onDelete - Callback for deleting option
 * @param {Function} onAdd - Callback for adding new option
 */
const OptionList = ({ 
  options = [], 
  questionType, 
  editable = false,
  onEdit,
  onDelete,
  onAdd 
}) => {
  const getInputType = () => {
    switch (questionType) {
      case 'multiple_choice':
      case 'dropdown':
        return 'radio';
      case 'checkbox':
        return 'checkbox';
      default:
        return 'radio';
    }
  };

  const inputType = getInputType();
  const sortedOptions = [...options].sort((a, b) => a.display_order - b.display_order);

  return (
    <div className={styles.optionList}>
      {sortedOptions.map((option, index) => (
        <div key={option.id || index} className={styles.optionItem}>
          <input 
            type={inputType} 
            name="option-preview" 
            disabled 
            className={styles.optionInput}
          />
          <span className={styles.optionText}>{option.option_text}</span>
          
          {editable && (
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => onEdit?.(option)}
                className={styles.editButton}
                title="Edit option"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(option.id)}
                className={styles.deleteButton}
                title="Delete option"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      ))}

      {editable && onAdd && (
        <button 
          type="button"
          onClick={onAdd}
          className={styles.addButton}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Option
        </button>
      )}
    </div>
  );
};

OptionList.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number,
      option_text: PropTypes.string.isRequired,
      display_order: PropTypes.number,
    })
  ),
  questionType: PropTypes.string.isRequired,
  editable: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onAdd: PropTypes.func,
};

export default OptionList;
