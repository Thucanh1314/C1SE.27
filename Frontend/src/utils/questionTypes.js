/**
 * Question Type Utilities
 * Shared helpers for question type formatting and display
 */

/**
 * Map of internal question type keys to display labels
 */
export const QUESTION_TYPE_LABELS = {
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  text: 'Text (Short)',
  rating: 'Rating',
  likert_scale: 'Likert Scale',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  open_ended: 'Open-Ended (Long)',
};

/**
 * Get formatted display label for a question type
 * @param {Object} question - Question object with type, question_type, or type_name
 * @returns {string} Formatted question type label
 */
export function getQuestionTypeLabel(question) {
  if (!question) return 'Unknown type';

  // Try different possible field names
  const typeKey = question.type ||
    question.question_type ||
    question.type_name ||
    question.QuestionType?.type_name;

  return QUESTION_TYPE_LABELS[typeKey] || typeKey || 'Unknown type';
}

/**
 * Get raw question type key (not formatted)
 * @param {Object} question - Question object
 * @returns {string} Question type key
 */
export function getQuestionType(question) {
  if (!question) return null;

  return question.type ||
    question.question_type ||
    question.type_name ||
    question.QuestionType?.type_name ||
    null;
}

/**
 * Check if a question type requires options
 * @param {string} questionType - Question type key
 * @returns {boolean} True if question type needs options
 */
export function questionTypeNeedsOptions(questionType) {
  const typesNeedingOptions = ['multiple_choice', 'checkbox', 'dropdown'];
  return typesNeedingOptions.includes(questionType);
}
