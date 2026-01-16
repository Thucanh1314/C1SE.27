import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../../contexts/ToastContext';
import AuthLayout from '../../../components/Layout/AuthLayout/AuthLayout';
import styles from './ResetPassword.module.scss';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showSuccess, showError } = useToast();

    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isTokenInvalid, setIsTokenInvalid] = useState(false);

    // Password strength check
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\W]{8,}$/;
    const isPasswordStrong = strongPasswordRegex.test(password);

    useEffect(() => {
        const tokenParam = searchParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
        } else {
            setIsTokenInvalid(true);
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isTokenInvalid) return;

        if (!isPasswordStrong) {
            showError('Password must meet strength requirements.');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            await axios.post(`${API_URL}/auth/reset-password`, {
                token,
                newPassword: password
            });

            showSuccess('Password reset successful! You can now login.');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            const status = error.response?.status;
            if (status === 400 || status === 401) {
                setIsTokenInvalid(true); // Token expired or invalid
                showError('Reset link is invalid or expired.');
            } else {
                showError(error.response?.data?.message || 'Failed to reset password.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (isTokenInvalid) {
        return (
            <AuthLayout title="Invalid Link" subtitle="This password reset link is invalid or has expired.">
                <div className={styles.invalidTokenState}>
                    <p>Please request a new password reset link.</p>
                    <Link to="/forgot-password" className={styles.submitButton} style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                        Go to Forgot Password
                    </Link>
                    <div className={styles.backLink}>
                        <Link to="/login">Back to Sign In</Link>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Set New Password"
            subtitle="Your new password must be different from previously used passwords."
        >
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="password">New Password</label>
                    <div className={styles.passwordWrapper}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 8 chars, Upper, Lower, Number"
                            className={styles.input}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            className={styles.togglePassword}
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>
                    {password && !isPasswordStrong && (
                        <small className={styles.errorText}>
                            Must be 8+ chars, incl. uppercase, lowercase, & number.
                        </small>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className={styles.input}
                        disabled={isLoading}
                    />
                </div>

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isLoading || !isPasswordStrong || !password || password !== confirmPassword}
                    style={{ opacity: (isLoading || !isPasswordStrong || password !== confirmPassword) ? 0.7 : 1 }}
                >
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
            </form>

            <div className={styles.backLink}>
                <Link to="/login">← Back to Sign In</Link>
            </div>
        </AuthLayout>
    );
}

export default ResetPassword;
