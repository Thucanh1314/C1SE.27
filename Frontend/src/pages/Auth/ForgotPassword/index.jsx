import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../../contexts/ToastContext';
import AuthLayout from '../../../components/Layout/AuthLayout/AuthLayout';
import styles from './ForgotPassword.module.scss';

// Use env var or default default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function ForgotPassword() {
    const { showSuccess, showError } = useToast();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            showError('Please enter your email address');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/auth/forgot-password`, { email });
            // API returns 200 for both existing and non-existing emails (security)
            setIsSent(true);
            showSuccess('If an account exists, a reset link has been sent.');
        } catch (error) {
            const status = error.response?.status;
            if (status === 429) {
                showError('Too many requests. Please try again later.');
            } else if (status === 500) {
                showError('Server error. Please try again later.');
            } else {
                // For other errors (400 etc), show message or generic error
                showError(error.response?.data?.message || 'Something went wrong.');
            }
            // Do NOT set isSent to true on error, let user retry
        } finally {
            setIsLoading(false);
        }
    };

    if (isSent) {
        return (
            <AuthLayout
                title="Check your inbox"
                subtitle={`If an account exists for ${email}, you will receive a reset link shortly.`}
            >
                <div className={styles.successMessage}>
                    <div className={styles.iconWrapper}>✉️</div>
                    <p>
                        Didn't receive the email? Check your spam folder or{' '}
                        <button onClick={() => setIsSent(false)} className={styles.resendLink}>
                            try another email address
                        </button>.
                    </p>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Reset Password"
            subtitle="Enter your email to receive reset instructions."
        >
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className={styles.input}
                        disabled={isLoading}
                    />
                </div>

                <button type="submit" className={styles.submitButton} disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
            </form>

            <div className={styles.backLink}>
                <Link to="/login">← Back to Sign In</Link>
            </div>
        </AuthLayout>
    );
}

export default ForgotPassword;
