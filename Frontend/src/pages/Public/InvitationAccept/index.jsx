import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import InviteService from '../../../api/services/invite.service';
import Loader from '../../../components/common/Loader/Loader';
import { useToast } from '../../../contexts/ToastContext';
import styles from './InvitationAccept.module.scss';
import { useAuth } from '../../../contexts/AuthContext';

const InvitationAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { state } = useAuth();
  const { isAuthenticated, isLoading: authLoading } = state;

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    console.log('InvitationAccept - Auth state:', { isAuthenticated, authLoading, token });
    
    if (authLoading) {
      console.log('Still loading auth state...');
      return;
    }

    const validateToken = async () => {
      try {
        console.log('Validating token:', token);
        const data = await InviteService.validateToken(token);
        console.log('Validation result:', data);
        
        if (data.valid) {
          setInviteData(data);
          
          // Check if survey requires login
          if (data.survey?.require_login && !isAuthenticated) {
            console.log('Survey requires login, redirecting...');
            const returnUrl = encodeURIComponent(`/public/invite/${token}`);
            navigate(`/login?redirect=${returnUrl}`);
            return;
          }
        } else {
          setError('Invalid invitation token');
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError(err.response?.data?.message || 'Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    };

    if (token) validateToken();
  }, [token, isAuthenticated, authLoading, navigate]);

  const handleAccept = async () => {
    try {
      setAccepting(true);
      console.log('Accepting invitation with token:', token);
      
      const result = await InviteService.acceptInvite(token);
      console.log('Accept result:', result);

      showToast('Invitation accepted! Redirecting...', 'success');

      // Try multiple fallback options for redirect
      let redirectUrl = result.redirect_url || 
                       result.survey_url ||
                       (inviteData?.survey?.id ? `/surveys/${inviteData.survey.id}/respond` : null);
                       
      console.log('Redirect URL:', redirectUrl);

      if (redirectUrl) {
        // Determine if it's internal route or external
        if (redirectUrl.startsWith('http')) {
          window.location.href = redirectUrl;
        } else {
          navigate(redirectUrl);
        }
      } else {
        // Fallback: redirect to dashboard or surveys page  
        console.log('No redirect URL, using fallback');
        if (isAuthenticated) {
          navigate('/surveys');  // Authenticated users go to surveys list
        } else {
          navigate('/login');    // Non-authenticated users go to login
        }
        showToast('Invitation accepted successfully!', 'success');
      }
    } catch (err) {
      console.error('Accept invitation error:', err);
      showToast(err.response?.data?.message || 'Failed to accept invitation', 'error');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <div className={styles.container}><Loader /></div>;

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2>Invitation Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className={styles.secondaryBtn}>Go Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>You're Invited!</h1>
          <p>You have been invited to participate in a survey.</p>
        </div>

        {inviteData && inviteData.survey && (
          <div className={styles.surveyInfo}>
            <h3>{inviteData.survey.title}</h3>
            {inviteData.survey.description && (
              <p className={styles.description}>{inviteData.survey.description}</p>
            )}
            <div className={styles.meta}>
              <span>Invited Email: <strong>{inviteData.email}</strong></span>
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.acceptBtn}
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? 'Starting Survey...' : 'Accept & Start Survey'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitationAccept;
