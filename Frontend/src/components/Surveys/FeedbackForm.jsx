import React, { useState } from 'react';
import http from '../../api/http';
import { FaStar } from 'react-icons/fa';

const FeedbackForm = ({ surveyId, responseId, onComplete, source = 'respondent' }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hover, setHover] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) return;

        try {
            setSubmitting(true);
            await http.post(`/surveys/${surveyId}/feedback`, {
                responseId: source === 'respondent' ? responseId : null,
                rating,
                comment,
                source
            });
            setSubmitted(true);
            if (onComplete) setTimeout(onComplete, 2000);
        } catch (err) {
            console.error('Feedback error:', err);
            // Even if error, we don't want to block the user flow too much
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div style={{ textAlign: 'center', padding: '20px', background: '#f0fdf4', borderRadius: '8px', marginTop: '20px' }}>
                <h3 style={{ color: '#166534', margin: '0 0 10px 0' }}>Thank You!</h3>
                <p style={{ margin: 0, color: '#15803d' }}>Your feedback helps us improve.</p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '40px', padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ textAlign: 'center', marginBottom: '15px', color: '#1f2937' }}>How was your experience taking this survey?</h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                {[...Array(5)].map((_, index) => {
                    const ratingValue = index + 1;
                    return (
                        <label key={index} style={{ cursor: 'pointer', margin: '0 5px' }}>
                            <input
                                type="radio"
                                name="rating"
                                value={ratingValue}
                                onClick={() => setRating(ratingValue)}
                                style={{ display: 'none' }}
                            />
                            <FaStar
                                size={32}
                                color={ratingValue <= (hover || rating) ? "#ffc107" : "#e4e5e9"}
                                onMouseEnter={() => setHover(ratingValue)}
                                onMouseLeave={() => setHover(0)}
                                style={{ transition: 'color 0.2s' }}
                            />
                        </label>
                    );
                })}
            </div>

            <textarea
                placeholder="Any additional comments? (Optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    marginBottom: '15px',
                    minHeight: '80px',
                    fontFamily: 'inherit'
                }}
            />

            {error && <p style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                    onClick={onComplete}
                    type="button"
                    style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    Skip
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={rating === 0 || submitting}
                    style={{
                        padding: '8px 24px',
                        background: rating === 0 ? '#d1d5db' : '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: rating === 0 ? 'not-allowed' : 'pointer',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                    }}
                >
                    {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
            </div>
        </div>
    );
};

export default FeedbackForm;
