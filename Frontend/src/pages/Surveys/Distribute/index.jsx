import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import SurveyService from '../../../api/services/survey.service';
import CollectorService from '../../../api/services/collector.service';
import Loader from '../../../components/common/Loader/Loader';
import StatusBadge from '../../../components/UI/StatusBadge';
import styles from './Distribute.module.scss';

const SurveyDistribute = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [survey, setSurvey] = useState(null);
  const [collectors, setCollectors] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [surveyData, collectorsData] = await Promise.all([
        SurveyService.getById(id),
        CollectorService.getBySurvey(id)
      ]);
      setSurvey(surveyData);

      // Map backend collector fields to frontend expected fields
      const mappedCollectors = (collectorsData || []).map(collector => ({
        id: collector.id,
        name: collector.name,
        type: collector.type,
        token: collector.token,
        publicUrl: collector.url, // Map 'url' to 'publicUrl'
        createdAt: collector.created_at, // Map 'created_at' to 'createdAt'
        responsesCount: collector.response_count || 0, // Map 'response_count' to 'responsesCount'
        is_active: collector.is_active,
        allow_multiple_responses: collector.allow_multiple_responses
      }));

      setCollectors(mappedCollectors);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to load survey', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCollector = async () => {
    try {
      setCreating(true);
      const response = await CollectorService.create({
        surveyId: parseInt(id),
        type: 'web_link',
        name: `Web Link - ${new Date().toLocaleDateString()}`
      });

      // Map backend fields to frontend expected fields
      const newCollector = {
        id: response.id,
        name: response.name,
        type: response.type,
        token: response.token,
        publicUrl: response.url, // Map 'url' to 'publicUrl'
        createdAt: response.created_at, // Map 'created_at' to 'createdAt'
        responsesCount: 0, // New collectors have 0 responses
        is_active: response.is_active,
        allow_multiple_responses: response.allow_multiple_responses
      };

      setCollectors([newCollector, ...collectors]);
      showToast('Distribution link created successfully!', 'success');
    } catch (error) {
      console.error('Create collector error:', error);
      showToast(error.response?.data?.message || 'Failed to create collector', 'error');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
  };

  if (loading) return <Loader />;

  if (!survey) {
    return (
      <div className={styles.error}>
        <h2>Survey not found</h2>
        <button onClick={() => navigate('/surveys')}>Back to Surveys</button>
      </div>
    );
  }

  const canDistribute = survey.status === 'active';

  return (
    <div className={styles.distribute}>
      <div className={styles.header}>
        <button onClick={() => navigate('/surveys')} className={styles.backButton}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className={styles.titleSection}>
          <h1>{survey.title}</h1>
          <StatusBadge status={survey.status} />
        </div>
      </div>

      {!canDistribute && (
        <div className={styles.warning}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong>Survey is not active</strong>
            <p>You must publish this survey before you can distribute it.</p>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Distribution Links</h2>
            <button
              onClick={handleCreateCollector}
              disabled={!canDistribute || creating}
              className={styles.createButton}
            >
              {creating ? 'Creating...' : 'Generate New Link'}
            </button>
          </div>

          {collectors.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔗</div>
              <h3>No distribution links yet</h3>
              <p>Create a link to start collecting responses</p>
            </div>
          ) : (
            <div className={styles.collectorsList}>
              {collectors.map((collector) => (
                <div key={collector.id} className={styles.collectorCard}>
                  <div className={styles.collectorHeader}>
                    <div className={styles.collectorInfo}>
                      <h3>{collector.name}</h3>
                      <span className={styles.collectorMeta}>
                        Created {new Date(collector.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={styles.collectorStats}>
                      <div className={styles.stat}>
                        <span className={styles.statValue}>{collector.responsesCount || 0}</span>
                        <span className={styles.statLabel}>Responses</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.linkSection}>
                    <div className={styles.linkDisplay}>
                      <span className={styles.linkLabel}>Public URL:</span>
                      <code className={styles.linkUrl}>{collector.publicUrl}</code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(collector.publicUrl)}
                      className={styles.copyButton}
                      title="Copy link"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy Link
                    </button>
                  </div>

                  <div className={styles.collectorActions}>
                    <button
                      onClick={() => window.open(collector.publicUrl, '_blank')}
                      className={styles.previewButton}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidebar}>
          <div className={styles.infoCard}>
            <h3>Distribution Tips</h3>
            <ul>
              <li>Share the link via email, social media, or messaging apps</li>
              <li>Each link can be tracked independently</li>
              <li>Links remain active as long as the survey is active</li>
              <li>You can create multiple links for different audiences</li>
            </ul>
          </div>

          <div className={styles.actionButtons}>
            <button
              onClick={() => navigate(`/surveys/${id}/results`)}
              className={styles.secondaryButton}
            >
              View Results
            </button>
            <button
              onClick={() => navigate(`/surveys/${id}/edit`)}
              className={styles.secondaryButton}
            >
              Edit Survey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyDistribute;
