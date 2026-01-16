import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SurveyService from '../../../api/services/survey.service';
import CollectorService from '../../../api/services/collector.service';
import Loader from '../../../components/common/Loader/Loader';
import { useToast } from '../../../contexts/ToastContext';
import { getVisibilityLabel, getIdentityModeLabel } from '../../../constants/surveyAccess';
import styles from './SurveyDetail.module.scss';

const SurveyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [survey, setSurvey] = useState(null);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch survey details
        const surveyResult = await SurveyService.getById(id);
        if (surveyResult.ok || surveyResult.success) {
          setSurvey(surveyResult.survey || surveyResult.data?.survey || surveyResult.data);
        } else {
          throw new Error('Survey not found');
        }
        
        // Fetch collectors for this survey
        try {
          const collectorsResult = await CollectorService.getBySurvey(id);
          setCollectors(Array.isArray(collectorsResult) ? collectorsResult : []);
        } catch (err) {
          console.warn('Could not fetch collectors:', err);
          setCollectors([]);
        }
      } catch (error) {
        console.error('Error fetching survey:', error);
        showToast(error.message || 'Failed to load survey', 'error');
        navigate('/surveys');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, showToast]);

  const handleRespond = (collectorToken) => {
    window.open(`/collector/${collectorToken}`, '_blank');
  };

  if (loading) return <Loader />;

  if (!survey) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorIcon}>❌</div>
        <h2>Survey Not Found</h2>
        <p>The survey you're looking for doesn't exist.</p>
        <button onClick={() => navigate('/surveys')} className={styles.backButton}>
          Back to Surveys
        </button>
      </div>
    );
  }

  return (
    <div className={styles.surveyDetail}>
      <button 
        className={styles.backButton}
        onClick={() => navigate('/surveys')}
      >
        ← Back to Surveys
      </button>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{survey.title}</h1>
          {survey.description && (
            <p className={styles.description}>{survey.description}</p>
          )}
          
          <div className={styles.meta}>
            <span className={`${styles.badge} ${styles.statusBadge}`}>
              {survey.status || 'Unknown'}
            </span>
            {survey.visibility && (
              <span className={`${styles.badge} ${styles.visibilityBadge}`}>
                {getVisibilityLabel(survey.visibility)}
              </span>
            )}
            {survey.identity_mode && (
              <span className={`${styles.badge} ${styles.identityBadge}`}>
                {getIdentityModeLabel(survey.identity_mode)}
              </span>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <section className={styles.surveyInfo}>
            <h2>Survey Information</h2>
            
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Questions</label>
                <span>{survey.template?.questions?.length || 0} questions</span>
              </div>
              
              {survey.start_date && (
                <div className={styles.infoItem}>
                  <label>Start Date</label>
                  <span>{new Date(survey.start_date).toLocaleDateString()}</span>
                </div>
              )}
              
              {survey.end_date && (
                <div className={styles.infoItem}>
                  <label>End Date</label>
                  <span>{new Date(survey.end_date).toLocaleDateString()}</span>
                </div>
              )}
              
              <div className={styles.infoItem}>
                <label>Created</label>
                <span>{new Date(survey.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </section>

          {collectors.length > 0 ? (
            <section className={styles.collectorsSection}>
              <h2>Respond to This Survey</h2>
              <p className={styles.sectionDescription}>
                Click a distribution link below to submit your response:
              </p>
              
              <div className={styles.collectorsList}>
                {collectors.map((collector, idx) => (
                  <div key={collector.id} className={styles.collectorCard}>
                    <div className={styles.collectorHeader}>
                      <h3>Distribution Link {idx + 1}</h3>
                      {collector.allow_multiple_responses && (
                        <span className={styles.badge}>Multiple Responses</span>
                      )}
                    </div>
                    
                    <div className={styles.collectorInfo}>
                      <p><strong>Responses:</strong> {collector.response_count || 0}</p>
                      {collector.max_responses && (
                        <p><strong>Limit:</strong> {collector.max_responses} responses</p>
                      )}
                      {collector.expiration_date && (
                        <p><strong>Expires:</strong> {new Date(collector.expiration_date).toLocaleDateString()}</p>
                      )}
                    </div>
                    
                    <button 
                      className={styles.respondButton}
                      onClick={() => handleRespond(collector.token)}
                    >
                      Answer Survey
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className={styles.noCollectors}>
              <div className={styles.emptyIcon}>🔗</div>
              <p>No response links are currently available for this survey.</p>
              <p className={styles.hint}>Check back later or ask the survey creator for a distribution link.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyDetail;
