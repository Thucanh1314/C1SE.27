import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import AuthLayout from '../../../components/Layout/AuthLayout/AuthLayout';
import Button from '../../../components/UI/Button';
import styles from './Register.module.scss';
import { FaGoogle } from 'react-icons/fa';

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    // Removed role from formData as it's not directly sent to API as 'role' field ideally, 
    // or we send 'user' fixed and handle intent separately.
    // But for now, we keep intent in local state.
    signupIntent: 'respondent'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleIntentChange = (e) => {
    setFormData({ ...formData, signupIntent: e.target.value });
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.full_name) {
      showError('Please fill in all required fields');
      return false;
    }
    if (formData.password.length < 6) {
      showError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    // Store intent for post-signup redirection
    localStorage.setItem('SIGNUP_INTENT', formData.signupIntent);

    try {
      // Always register as 'user'. Intent determines if we redirect to onboarding later.
      await register(
        formData.username,
        formData.email,
        formData.password,
        formData.full_name,
        'user' // Force role to user
      );

      showSuccess('Registration successful! Redirecting...');

      // Redirect logic based on intent
      setTimeout(() => {
        if (formData.signupIntent === 'creator') {
          navigate('/onboarding/workspace');
        } else {
          navigate('/surveys'); // or /dashboard
        }
      }, 1000);
    } catch (error) {
      showError(error.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = () => {
    // Store intent before leaving for Google OAuth
    localStorage.setItem('SIGNUP_INTENT', formData.signupIntent);
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join ALLMTAGS to start creating surveys."
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="full_name">Full Name</label>
          <input
            type="text"
            id="full_name"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            placeholder="John Doe"
            className={styles.input}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="johndoe"
            className={styles.input}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="name@company.com"
            className={styles.input}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="create a password"
            className={styles.input}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="confirm your password"
            className={styles.input}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label>I want to...</label>
          <div className={styles.radioGroup} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '5px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="radio"
                name="signupIntent"
                value="respondent"
                checked={formData.signupIntent === 'respondent'}
                onChange={handleIntentChange}
              />
              <span>Answer surveys only</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
              <input
                type="radio"
                name="signupIntent"
                value="creator"
                checked={formData.signupIntent === 'creator'}
                onChange={handleIntentChange}
              />
              <span>Create surveys</span>
            </label>
            <small style={{ color: '#666', fontSize: '0.85em', marginLeft: '24px' }}>
              {formData.signupIntent === 'creator'
                ? "You'll be asked to set up a workspace after signup."
                : "You can simply join existing surveys."}
            </small>
          </div>
        </div>

        <Button
          type="submit"
          loading={isLoading}
          className={styles.submitButton}
        >
          Sign Up
        </Button>
      </form>

      <div className={styles.divider}>
        <span>OR</span>
      </div>

      <a
        href="http://localhost:5000/api/auth/google"
        className={styles.googleButton}
        onClick={handleGoogleClick}
      >
        <FaGoogle />
        Sign up with Google
      </a>

      <div className={styles.loginRow}>
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  );
}

export default Register;
