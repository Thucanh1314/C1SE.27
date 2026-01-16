import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import AuthLayout from '../../../components/Layout/AuthLayout/AuthLayout';
import Button from '../../../components/UI/Button';
import styles from './Login.module.scss';
// eslint-disable-next-line no-unused-vars
import { FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, state } = useAuth();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.identifier || !formData.password) {
      showError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: formData.identifier, password: formData.password });
      showSuccess('Login successful!');

      const from = location.state?.from?.pathname;
      const redirectParam = new URLSearchParams(location.search).get('redirect');
      const userRole = state.user?.role;

      let redirectPath = '/dashboard';
      if (redirectParam) redirectPath = decodeURIComponent(redirectParam);
      else if (from && from !== '/login') redirectPath = from;
      else if (userRole === 'user') redirectPath = '/surveys';

      navigate(redirectPath, { replace: true });
    } catch (error) {
      showError(error.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const reason = params.get('reason');

    if (error === 'GoogleAuthFailed') {
      let msg = 'Google Sign-In failed.';
      switch (reason) {
        case 'MissingEmail': msg = 'Your Google account does not provide an email address.'; break;
        case 'DbCreateFailed': msg = 'Could not create account. Please try again.'; break;
        case 'DbLinkFailed': msg = 'Could not link Google account. Please try again.'; break;
        case 'TokenExchangeFailed': msg = 'Could not verify with Google. Please try again.'; break;
        default: msg = 'Google Sign-In failed. Please try again or use email.';
      }
      showError(msg);
      // Clean URL
      navigate('/login', { replace: true });
    }
  }, [location, navigate, showError]);

  return (
    <AuthLayout
      title="Start Analyzing"
      subtitle="Sign in to access your analytics dashboard."
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="identifier">Email Address</label>
          <input
            type="text"
            id="identifier"
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            placeholder="name@company.com"
            disabled={isLoading}
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <div className={styles.labelRow}>
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={isLoading}
              className={styles.input}
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          loading={isLoading}
          className={styles.submitButton}
        >
          Sign In
        </Button>
      </form>

      <div className={styles.divider}>
        <span>OR</span>
      </div>

      <a href="http://localhost:5000/api/auth/google" className={styles.googleButton}>
        <FaGoogle />
        Continue with Google
      </a>

      <div className={styles.registerRow}>
        Don't have an account? <Link to="/register">Sign up</Link>
      </div>
    </AuthLayout>
  );
}

export default Login;
