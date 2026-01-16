import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import SurveyService from '../../../api/services/survey.service';
import AnalyticsService from '../../../api/services/analytics.service'; // Import AnalyticsService
// import SurveyAccess from '../../../components/SurveyAccess';

// Tabs
import OverviewTab from './components/OverviewTab';
import QuestionsTab from './components/QuestionsTab';
import ResponsesTab from './components/ResponsesTab';
import AiInsightsTab from './components/AiInsightsTab';
// Chat
import AnalysisChat from '../../../components/Analytics/AnalysisChat';
import FeedbackForm from '../../../components/Surveys/FeedbackForm'; // Import FeedbackForm


import styles from './Results.module.scss';
import { FaFilter, FaRedo } from 'react-icons/fa';

const SurveyResults = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // const { state } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState(null);
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Filter State
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({});
  const [availableSegments, setAvailableSegments] = useState(null);
  const [selectedIdentity, setSelectedIdentity] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [selectedOption, setSelectedOption] = useState('');

  // Internal Feedback Modal State
  const [showInternalFeedback, setShowInternalFeedback] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch Survey, Segments AND Analytics Overview (Single Source of Truth)
      const [surveyData, segmentsData, overviewData] = await Promise.all([
        SurveyService.getById(id),
        AnalyticsService.getSegments(id),
        AnalyticsService.getOverview(id) // Fetch real-time count
      ]);

      setSurvey(surveyData);
      setAnalyticsOverview(overviewData);

      if (segmentsData) {
        setAvailableSegments(segmentsData); // { identity: [], questions: [] }
      }
    } catch (error) {
      console.error('Failed to load survey data:', error);
      showToast('Failed to load survey data', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Filter Logic
  const handleFilterChange = useCallback(() => {
    const newFilters = {};
    if (selectedIdentity) newFilters.identityType = selectedIdentity;
    if (selectedQuestion && selectedOption) {
      newFilters.questionFilter = {
        questionId: selectedQuestion,
        optionId: selectedOption
      };
    }
    setFilters(newFilters);
  }, [selectedIdentity, selectedQuestion, selectedOption]);

  // Auto-apply filters when selection changes (optional, or use Apply button)
  useEffect(() => {
    handleFilterChange();
  }, [handleFilterChange]);

  const handleClearFilters = () => {
    setSelectedIdentity('');
    setSelectedQuestion('');
    setSelectedOption('');
    setFilters({});
  };

  // Helper getters for robust data access
  const getResponseCount = () => {
    if (analyticsOverview) return analyticsOverview.totalResponses;
    return survey?.response_count || 0; // Fallback
  };

  const getQuestionCount = () => {
    if (analyticsOverview?.questionsCount) return analyticsOverview.questionsCount;
    return availableSegments?.questions?.length || 0; // Fallback
  };

  const hasResponses = getResponseCount() > 0;

  // ... (rest of component logic)

  const tabs = [
    { id: 'overview', label: 'Overview', icon: null },
    { id: 'questions', label: 'Questions', icon: null }, // Reordered: Overview -> Questions -> Responses
    { id: 'responses', label: 'Responses', icon: null },
    { id: 'insights', label: 'AI Insights', icon: null },
    { id: 'chat', label: 'Ask AI', icon: null }
  ];

  const getOptionsForQuestion = (qId) => {
    // Find question in availableSegments.questions
    const q = availableSegments?.questions?.find(item => item.questionId === parseInt(qId));
    return q ? q.options : []; // options: [{ id, text }]
  };

  // Helper for generating Skeleton UI
  const renderSkeletons = () => (
    <div className={styles.content}>
      {activeTab === 'overview' && (
        <div className={styles.statsOverview}>
          {[1, 2, 3].map(i => (
            <div key={i} className={`${styles.skeleton} ${styles.skeletonStats}`} />
          ))}
        </div>
      )}
      <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
    </div>
  );

  return (
    <div className={styles.results}>
      {/* 1. Header Shell - Always Visible */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.titleSection}>
            {loading || !survey ? (
              <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '300px', height: '40px' }} />
            ) : (
              <h1>{survey.title}</h1>
            )}

            <div className={styles.metaLine}>
              {loading || !survey ? (
                <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '200px', margin: 0 }} />
              ) : (
                <>
                  <span className={`${styles.statusBadge} ${styles[`status${survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}`]}`}>
                    {survey.status}
                  </span>
                  <span className={styles.dot}>·</span>
                  <span>{getQuestionCount()} questions</span>
                  <span className={styles.dot}>·</span>
                  <span className={styles.responseCount}>
                    {getResponseCount()} {getResponseCount() === 1 ? 'response' : 'responses'} collected
                  </span>
                </>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => setShowInternalFeedback(!showInternalFeedback)}
              className={styles.actionButton}
              title="Leave internal feedback/notes"
              style={{ marginRight: '8px' }}
            >
              Rate Quality
            </button>
            <button
              onClick={() => navigate(`/surveys/${id}/edit`)}
              className={styles.actionButton}
              disabled={loading}
            >
              Edit
            </button>
            <button
              onClick={() => navigate(`/surveys/${id}/distribute`)}
              className={styles.actionButtonPrimary}
              disabled={loading}
            >
              Distribute
            </button>
          </div>
        </div>

        {/* Inline Internal Feedback Form */}
        {showInternalFeedback && (
          <div style={{ padding: '0 20px 20px 20px', maxWidth: '600px', margin: '0 auto' }}>
            <FeedbackForm
              surveyId={id}
              source="internal"
              onComplete={() => {
                showToast('Internal feedback saved', 'success');
                setShowInternalFeedback(false);
                // Optionally refresh data if needed
              }}
            />
          </div>
        )}
      </div>

      {/* Next Action Banner - Only show when no responses */}
      {!loading && survey && !hasResponses && (
        <div className={styles.nextActionBanner}>
          <div className={styles.nextActionContent}>
            <p className={styles.nextActionMessage}>This survey has not collected any responses yet.</p>
            <div className={styles.nextActionButtons}>
              <button
                onClick={() => navigate(`/surveys/${id}/distribute`)}
                className={styles.actionButtonPrimary}
              >
                Distribute Survey
              </button>
              <button
                onClick={() => window.open(`/s/${survey.code || ''}`, '_blank')}
                className={styles.actionButton}
              >
                Preview Survey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Toolbar (Filters) - Fixed Height Shell */}
      <div className={styles.toolbar}>
        <div className={styles.filterWrapper}>
          <button
            className={`${styles.filterToggle} ${isFiltersOpen ? styles.active : ''} ${!hasResponses ? styles.filterDisabled : ''}`}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            disabled={loading || !hasResponses}
            title={!hasResponses ? 'Filters will be available once responses are collected' : ''}
          >
            <FaFilter size={12} /> Filter responses
          </button>

          {isFiltersOpen && (
            <div className={styles.filterPopover}>
              <div className={styles.filterRow}>
                <label>Respondent Type</label>
                <select
                  value={selectedIdentity}
                  onChange={(e) => setSelectedIdentity(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="">All Respondents</option>
                  {availableSegments?.identity?.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} Users
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterRow}>
                <label>Question</label>
                <select
                  value={selectedQuestion}
                  onChange={(e) => {
                    setSelectedQuestion(e.target.value);
                    setSelectedOption('');
                  }}
                  className={styles.filterSelect}
                >
                  <option value="">Filter by Answer...</option>
                  {availableSegments?.questions?.map(q => (
                    <option key={q.questionId} value={q.questionId}>
                      {q.questionText.length > 30 ? q.questionText.slice(0, 30) + '...' : q.questionText}
                    </option>
                  ))}
                </select>
              </div>

              {selectedQuestion && (
                <div className={styles.filterRow}>
                  <label>Option</label>
                  <select
                    value={selectedOption}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="">Select Option</option>
                    {getOptionsForQuestion(selectedQuestion).map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.text}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedIdentity || selectedQuestion) && (
                <div className={styles.filterActions}>
                  <button onClick={handleClearFilters} className={styles.clearFilters}>
                    <FaRedo size={12} /> Reset Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right side of toolbar can go here (e.g. Search question) */}
        <div></div>
      </div>

      {/* 3. Tabs - Fixed Height Shell */}
      <div className={styles.tabsHeader}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={loading}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Content Area - Handles Loading/Empty States internally */}
      {loading ? (
        renderSkeletons()
      ) : !survey ? (
        <NotFoundRedirect navigate={navigate} />
      ) : (
        <div className={styles.content}>
          <div style={{ display: activeTab === 'overview' ? 'block' : 'none' }}>
            {(!hasResponses && !filters.identityType) ? (
              <EmptyState survey={survey} navigate={navigate} />
            ) : (
              <OverviewTab surveyId={id} filters={filters} />
            )}
          </div>

          <div style={{ display: activeTab === 'questions' ? 'block' : 'none' }}>
            {(!hasResponses && !filters.identityType) ? (
              <EmptyState survey={survey} navigate={navigate} />
            ) : (
              <QuestionsTab surveyId={id} filters={filters} />
            )}
          </div>

          <div style={{ display: activeTab === 'responses' ? 'block' : 'none' }}>
            {(!hasResponses && !filters.identityType) ? (
              <EmptyState survey={survey} navigate={navigate} />
            ) : (
              <ResponsesTab surveyId={id} survey={survey} />
            )}
          </div>

          {activeTab === 'insights' && (
            <AiInsightsTab surveyId={id} responseCount={survey.response_count} />
          )}

          {activeTab === 'chat' && (
            <div className={styles.chatWrapper}>
              <AnalysisChat
                surveyId={id}
                responseCount={analyticsOverview?.totalResponses || survey?.response_count || 0}
                surveyTitle={survey?.title || 'Survey'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Extracted Empty State to keep render clean
const EmptyState = ({ survey, navigate }) => (
  <div className={styles.emptyStateContainer}>
    <h3>No responses yet</h3>
    <p className={styles.emptyExplanation}>
      This survey has not collected any responses yet. Analytics and insights will appear here once respondents start submitting their answers.
    </p>
    <div className={styles.emptyNextSteps}>
      <p className={styles.nextStepsLabel}>Next steps:</p>
      <div className={styles.emptyActions}>
        <button
          onClick={() => navigate(`/surveys/${survey.id}/distribute`)}
          className={styles.actionButtonPrimary}
        >
          Distribute Survey
        </button>
        <button
          onClick={() => window.open(`/s/${survey.code || ''}`, '_blank')}
          className={styles.actionButton}
        >
          Preview as Respondent
        </button>
      </div>
    </div>
  </div>
);

const NotFoundRedirect = ({ navigate }) => {
  useEffect(() => {
    const timer = setTimeout(() => navigate('/surveys'), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className={styles.error}>
      <h2>Survey not found</h2>
      <p>This survey may have been deleted or you don't have permission to view it.</p>
      <p>Redirecting to list...</p>
      <button onClick={() => navigate('/surveys')}>Go Back Now</button>
    </div>
  );
};

export default SurveyResults;

