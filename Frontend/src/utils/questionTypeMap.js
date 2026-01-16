// Frontend/src/utils/questionTypeMap.js

/**
 * Map question type names to their database IDs
 * These should correspond to entries in the question_types table
 */
export const QUESTION_TYPE_MAP = {
  single_choice: 1,
  multiple_choice: 2,
  text: 3,
  rating: 4,
  likert_scale: 5,
  dropdown: 6,
  checkbox: 7,
  open_ended: 8,
};

/**
 * Reverse map from IDs to type names
 */
export const QUESTION_TYPE_ID_MAP = {
  1: 'single_choice',
  2: 'multiple_choice',
  3: 'text',
  4: 'rating',
  5: 'likert_scale',
  6: 'dropdown',
  7: 'checkbox',
  8: 'open_ended',
};

/**
 * Get type ID from type name
 */
export const getTypeId = (typeName) => {
  return QUESTION_TYPE_MAP[typeName] || 1;
};

/**
 * Get type name from type ID
 */
export const getTypeName = (typeId) => {
  return QUESTION_TYPE_ID_MAP[typeId] || 'text';
};
