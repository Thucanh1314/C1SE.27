// Canonical Question Types mapping matching DB 'question_types' table
const QUESTION_TYPES = {
    SINGLE_CHOICE: 1,
    MULTIPLE_CHOICE: 2,
    TEXT: 3,         // Short text input
    RATING: 4,       // Star/Number rating
    LIKERT_SCALE: 5, // Agreement scale
    DROPDOWN: 6,
    CHECKBOX: 7,     // Explicit Checkbox type (legacy or specific)
    OPEN_ENDED: 8,   // Long text textarea
    // High ID types which might exist but aren't core canonicals yet
    LIKERT: 9,
    MATRIX: 10,
    RANKING: 11,
    // YES_NO: 12 - REMOVED. Use MULTIPLE_CHOICE with Yes/No options.
};

// Reverse mapping for logging/display
const QUESTION_TYPE_NAMES = Object.fromEntries(
    Object.entries(QUESTION_TYPES).map(([key, value]) => [value, key])
);

// Canonical Keys used in Frontend/AI (Slugs)
const CANONICAL_KEYS = {
    single_choice: QUESTION_TYPES.SINGLE_CHOICE,
    multiple_choice: QUESTION_TYPES.MULTIPLE_CHOICE,
    text: QUESTION_TYPES.TEXT,
    rating: QUESTION_TYPES.RATING,
    likert_scale: QUESTION_TYPES.LIKERT_SCALE,
    dropdown: QUESTION_TYPES.DROPDOWN,
    checkbox: QUESTION_TYPES.CHECKBOX,
    open_ended: QUESTION_TYPES.OPEN_ENDED,
    matrix: QUESTION_TYPES.MATRIX,
    ranking: QUESTION_TYPES.RANKING,
    yes_no: 12 // Canonical key 'yes_no' maps to 12. If 12 missing, service must handle.
};

module.exports = {
    QUESTION_TYPES,
    QUESTION_TYPE_NAMES,
    CANONICAL_KEYS
};
