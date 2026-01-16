import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import SurveyService from '../../../api/services/survey.service';
import CollectorService from '../../../api/services/collector.service';
import Loader from '../../../components/common/Loader/Loader';
import Pagination from '../../../components/common/Pagination/Pagination';
import StatusBadge from '../../../components/UI/StatusBadge';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import Checkbox from '../../../components/UI/Checkbox/Checkbox';
import { useToast } from '../../../contexts/ToastContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import styles from './SurveyList.module.scss';
import Button from '../../../components/UI/Button';
import {
  LuPencil,
  LuSend,
  LuChartBar,
  LuArchive,
  LuPlay,
  LuRotateCcw,
  LuHistory,
  LuClipboardCheck,
  LuEye,
  LuPlus,
  LuTrash2
} from 'react-icons/lu';
// Simple debounce implementation
const useDebounceValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return [debouncedValue]; // Return as array to be consistent with usage
};


const SurveyList = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const { state } = useAuth();
  const user = state.user;
  const isCreator = user?.role === 'creator' || user?.role === 'admin';
  const isRespondent = user?.role === 'user';

  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  // Respondent View State
  const [respondentTab, setRespondentTab] = useState('pending'); // 'pending' | 'completed'



  // No client-side filtering needed anymore as backend handles 'pending'/'completed'
  // But we still need metadata for display (deadline text etc)
  const getRespondentMeta = (survey) => {
    const now = new Date();
    const endDate = survey.end_date ? new Date(survey.end_date) : null;
    const isExpired = endDate && endDate < now;
    // For pending view, hasResponse is implicitly false from backend.
    // For completed view, hasResponse is implicitly true.
    // However, let's keep robust check if data available.
    // In getAssignedSurveys, we don't strictly return 'my_response_count' unless we added it to attributes.
    // But we filter by ID NOT IN responses for pending.

    // State derivation
    let state = 'NOT_STARTED';
    if (respondentTab === 'completed') state = 'COMPLETED';
    else if (isExpired) state = 'EXPIRED';

    // Deadline text
    let deadlineText = null;
    if (endDate) {
      if (isExpired) {
        deadlineText = `Expired on ${endDate.toLocaleDateString()}`;
      } else {
        const diffTime = Math.abs(endDate - now);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        deadlineText = `Ends in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      }
    }

    return { state, deadlineText, isExpired };
  };

  // Use surveys directly
  const respondentSurveysToRender = surveys;


  // Unified State for Filters & Pagination
  const [filterState, setFilterState] = useState({
    page: 1,
    limit: 10,
    status: 'all',
    search: '',
    source: 'all'
  });

  const [debouncedSearch] = useDebounceValue(filterState.search, 500);

  // Pagination State (Server response)
  const [paginationInfo, setPaginationInfo] = useState({
    totalPages: 0,
    totalItems: 0
  });

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [surveyToDelete, setSurveyToDelete] = useState(null);

  // Bulk Selection State
  const [selectedSurveys, setSelectedSurveys] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [surveyToRestore, setSurveyToRestore] = useState(null);

  const fetchSurveys = useCallback(async (params = {}, signal) => {
    try {
      setLoading(true);

      // Defensive defaults - Ensure we always have valid values
      const apiParams = {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        search: params?.search ?? '',
        status: (params?.status && params.status !== 'all') ? params.status : undefined,
        source: params?.source ?? 'all'
      };

      let response;
      if (isRespondent) {
        // For respondents, utilize the specific assigned endpoint
        // Map respondentTab (pending/completed) to API status param
        // Note: The UI state 'respondentTab' might need to be passed in from useEffect params or read from state if stable.
        // Better to pass 'status' param as 'pending' or 'completed' explicitly from the caller/effect.
        // We will relay on apiParams.status to carry the tab value.

        // If apiParams.status is 'all' (default), default to 'pending' for safety, 
        // though useEffect below should sync it.
        const intentStatus = (apiParams.status === 'completed') ? 'completed' : 'pending';
        response = await SurveyService.getAssigned({ ...apiParams, status: intentStatus }, { signal });
      } else {
        // Creator/Admin flow
        response = await SurveyService.getAll(apiParams, { signal });
      }

      setSurveys(response?.surveys || []);

      // Safe pagination handling
      if (response?.pagination) {
        setPaginationInfo({
          totalPages: response.pagination.totalPages ?? 0,
          totalItems: response.pagination.total ?? 0
        });
      } else {
        // Fallback if pagination missing (e.g. filtered list or minimal API)
        setPaginationInfo({
          totalPages: 1,
          totalItems: response?.surveys?.length || 0
        });
      }

      setSelectedSurveys([]);
    } catch (error) {
      if (error && (error.name === 'CanceledError' || error.message === 'canceled')) {
        return; // Ignore cancelled requests
      }
      console.error('Error fetching surveys:', error);
      setSurveys([]);
      showToast(error?.response?.data?.message || 'Failed to fetch surveys', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, isRespondent]);

  // Effect to handle Fetching with AbortController
  useEffect(() => {
    const controller = new AbortController();

    // Pass the correct params
    // If respondent, map 'respondentTab' to 'status'
    const statusParam = isRespondent ? respondentTab : filterState.status;

    const currentParams = {
      page: filterState.page,
      limit: filterState.limit,
      status: statusParam,
      search: debouncedSearch,
      source: filterState.source
    };

    fetchSurveys(currentParams, controller.signal);

    return () => controller.abort();
  }, [fetchSurveys, filterState.page, filterState.limit, filterState.status, filterState.source, debouncedSearch, isRespondent, respondentTab]);


  // Handlers
  const handleSearchChange = (e) => {
    setFilterState(prev => ({ ...prev, search: e.target.value, page: 1 })); // Reset page on search
  };

  const handleStatusChangeFilter = (e) => {
    setFilterState(prev => ({ ...prev, status: e.target.value, page: 1 })); // Reset page on filter
  };

  const handlePageChange = (newPage) => {
    setFilterState(prev => ({ ...prev, page: newPage }));
  };

  const handleLimitChange = (e) => {
    setFilterState(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }));
  };

  const handleDelete = async () => {
    if (!surveyToDelete) return;

    try {
      await SurveyService.delete(surveyToDelete.id);
      showToast('Survey deleted successfully', 'success');
      setShowDeleteModal(false);
      setSurveyToDelete(null);
      fetchSurveys(filterState);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete survey', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await SurveyService.deleteMany(selectedSurveys);
      showToast('Selected surveys deleted successfully', 'success');
      setShowBulkDeleteModal(false);
      setSelectedSurveys([]);
      fetchSurveys(filterState);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete surveys', 'error');
    }
  };

  const handleStatusChange = async (survey, newStatus) => {
    try {
      await SurveyService.updateStatus(survey.id, newStatus);
      showToast(`Survey ${newStatus} successfully`, 'success');
      fetchSurveys(filterState);
    } catch (error) {
      showToast(error.response?.data?.message || `Failed to ${newStatus} survey`, 'error');
    }
  };

  const handleRestore = async () => {
    if (!surveyToRestore) return;
    try {
      await SurveyService.restore(surveyToRestore.id);
      showToast('Survey restored successfully', 'success');
      setShowRestoreModal(false);
      setSurveyToRestore(null);
      fetchSurveys(filterState);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to restore survey', 'error');
    }
  };



  // Selection Handlers (Server-Side safe: only select from current page)
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = surveys.map(s => s.id);
      setSelectedSurveys(allIds);
    } else {
      setSelectedSurveys([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedSurveys(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Handle Start Survey - get first active collector and redirect
  const handleStartSurvey = async (surveyId) => {
    try {
      const collectors = await CollectorService.getBySurvey(surveyId);
      const activeCollector = collectors.find(c => c.is_active && c.token);

      if (!activeCollector) {
        showToast('No active collector found for this survey', 'error');
        return;
      }

      // Redirect to public collector URL
      window.location.href = `/collector/${activeCollector.token}`;
    } catch (error) {
      console.error('Error getting collector for survey:', error);
      showToast('Failed to start survey. Please try again.', 'error');
    }
  };

  const isAllSelected = surveys.length > 0 && surveys.every(s => selectedSurveys.includes(s.id));

  if (loading && surveys.length === 0) return <Loader fullScreen message="Loading surveys..." />;

  return (
    <div className={styles.surveyList}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('my_surveys')}</h1>
          {isCreator && (
            <p className={styles.summaryLine}>
              {surveys.length} surveys · {surveys.filter(s => s.status === 'active').length} active · {surveys.reduce((acc, s) => acc + (s.response_count || 0), 0)} total responses
            </p>
          )}
        </div>
        {isCreator && (
          <Button
            onClick={() => navigate('/surveys/new')}
          >
            <LuPlus size={20} />
            {t('create_survey')}
          </Button>
        )}
      </div>

      {isRespondent ? (
        // Respondent View
        <div className={styles.respondentView}>
          <div className={styles.tabs}>
            <Button
              variant={respondentTab === 'pending' ? 'primary' : 'ghost'}
              onClick={() => setRespondentTab('pending')}
            >
              Pending
            </Button>
            <Button
              variant={respondentTab === 'completed' ? 'primary' : 'ghost'}
              onClick={() => setRespondentTab('completed')}
            >
              Completed
            </Button>
          </div>

          <div className={styles.respondentList}>
            {respondentSurveysToRender.length === 0 ? (
              <div className={styles.emptyState}>
                {respondentTab === 'pending' ? (
                  <>
                    <div className={styles.emptyIcon}>📂</div>
                    <h3>No surveys available</h3>
                    <p>You have no pending surveys at the moment.</p>
                    <div className={styles.emptyActions}>
                      <Button variant="secondary" onClick={() => setRespondentTab('completed')}>
                        <LuHistory size={18} />
                        View Completed Surveys
                      </Button>
                      <Button variant="ghost" onClick={() => navigate('/invitations')}>
                        <LuClipboardCheck size={18} />
                        Check Invitations
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.emptyIcon}>✅</div>
                    <h3>No completed surveys</h3>
                    <p>Surveys you complete will appear here.</p>
                  </>
                )}
              </div>
            ) : (
              respondentSurveysToRender.map(survey => {
                const { state, deadlineText } = getRespondentMeta(survey);
                const questionCount = survey.questionCount ?? survey.template?.Questions?.length ?? 0;

                return (
                  <div key={survey.id} className={styles.respondentCard}>
                    <div className={styles.cardMain}>
                      <h3 className={styles.cardTitle}>{survey.title}</h3>
                      {survey.description && <p className={styles.cardDesc}>{survey.description}</p>}

                      <div className={styles.cardMeta}>
                        {deadlineText && <span className={styles.metaItem}>{deadlineText}</span>}
                        {state === 'COMPLETED' && (
                          <span className={styles.metaItem}>
                            Submitted on {survey.updated_at ? new Date(survey.updated_at).toLocaleDateString() : 'Unknown date'}
                          </span>
                        )}
                        {state === 'COMPLETED' && (
                          <span className={styles.metaItem}>
                            {questionCount} Questions
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={styles.cardAction}>
                      {state === 'NOT_STARTED' && (
                        <Button
                          onClick={() => handleStartSurvey(survey.id)}
                        >
                          <LuPlay size={18} />
                          Start survey
                        </Button>
                      )}
                      {state === 'EXPIRED' && (
                        <Button disabled>Expired</Button>
                      )}
                      {state === 'COMPLETED' && (
                        <Button
                          variant="secondary"
                          onClick={() => navigate(`/my-responses?search=${encodeURIComponent(survey.title)}`)}
                        >
                          <LuEye size={18} />
                          View my answers
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        // Creator View (Existing)
        <>
          <div className={styles.workspaceFilter}>
            <Button
              variant={filterState.source === 'all' ? 'primary' : 'ghost'}
              onClick={() => setFilterState(prev => ({ ...prev, source: 'all', page: 1 }))}
              size="sm"
            >
              {t('all_surveys')}
            </Button>
            <Button
              variant={filterState.source === 'personal' ? 'primary' : 'ghost'}
              onClick={() => setFilterState(prev => ({ ...prev, source: 'personal', page: 1 }))}
              size="sm"
            >
              {t('personal')}
            </Button>
            <Button
              variant={filterState.source === 'workspace' ? 'primary' : 'ghost'}
              onClick={() => setFilterState(prev => ({ ...prev, source: 'workspace', page: 1 }))}
              size="sm"
            >
              {t('workspaces')}
            </Button>
          </div>

          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder={t('search_surveys')}
                value={filterState.search}
                onChange={handleSearchChange}
                className={styles.searchInput}
                style={{ paddingLeft: '4rem' }}
              />
            </div>

            <div className={styles.statusFilter}>
              <label>{t('status')}:</label>
              <select
                value={filterState.status}
                onChange={handleStatusChangeFilter}
                className={styles.select}
              >
                <option value="all">{t('view_all') || 'All'}</option>
                <option value="draft">{t('draft')}</option>
                <option value="active">{t('active')}</option>
                <option value="closed">{t('closed')}</option>
                <option value="archived">{t('archived') || 'Archived'}</option>
              </select>
            </div>

            <div className={styles.pageSizeControl}>
              <select
                value={filterState.limit}
                onChange={handleLimitChange}
                className={styles.select}
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <span className={styles.resultCount}>
              Total: {paginationInfo.totalItems}
            </span>
          </div>

          {/* Bulk Actions Bar */}
          {selectedSurveys.length > 0 && (
            <div className={styles.bulkActions}>
              <span className={styles.selectedCount}>
                {selectedSurveys.length} selected
              </span>
              <Button
                variant="danger"
                onClick={() => setShowBulkDeleteModal(true)}
                size="sm"
              >
                <LuTrash2 size={16} />
                Delete Selected
              </Button>
            </div>
          )}

          {surveys.length === 0 && !loading ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📊</div>
              <h3>{t('no_surveys_found')}</h3>
              <p>{t('create_first_survey_desc') || 'Create your first survey to start collecting responses'}</p>
              <Button
                onClick={() => navigate('/surveys/new')}
              >
                {t('create_survey')}
              </Button>
            </div>
          ) : (
            <>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <Checkbox
                          checked={isAllSelected}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>{t('survey_name') || 'Title'}</th>
                      <th>{t('status')}</th>
                      <th>RESPONSES</th>
                      <th>NEXT ACTION</th>
                      <th>{t('created_at')}</th>
                      <th>{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {surveys.map((survey) => {
                      const responseCount = survey.response_count || 0;
                      const myResponseCount = survey.my_response_count || 0;

                      // Next Action Logic
                      let nextAction = '';
                      if (survey.status === 'draft') nextAction = 'Finish setup';
                      else if (survey.status === 'active') {
                        if (responseCount === 0) nextAction = 'Distribute survey';
                        else nextAction = 'View results';
                      }
                      else if (survey.status === 'closed') nextAction = 'Review summary';

                      return (
                        <tr key={survey.id} className={selectedSurveys.includes(survey.id) ? styles.selectedRow : ''}>
                          <td>
                            <Checkbox
                              checked={selectedSurveys.includes(survey.id)}
                              onChange={() => handleSelectOne(survey.id)}
                            />
                          </td>
                          <td>
                            <div className={styles.surveyTitle}>
                              <span
                                className={`${styles.title} ${styles.clickableTitle}`}
                                onClick={() => {
                                  if (survey.status === 'draft') {
                                    navigate(`/surveys/${survey.id}/edit`);
                                  } else if (survey.status === 'active' && responseCount === 0) {
                                    navigate(`/surveys/${survey.id}/distribute`);
                                  } else {
                                    navigate(`/surveys/${survey.id}/results`);
                                  }
                                }}
                              >
                                {survey.title}
                              </span>
                              {survey.description && (
                                <span className={styles.description}>{survey.description}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={survey.status} label={t(survey.status)} />
                          </td>
                          <td>
                            <div className={styles.responseCell}>
                              <span className={styles.responseCount}>
                                {myResponseCount > 0 ? `1 / ${responseCount}` : `0 / —`}
                              </span>
                              {responseCount === 0 && (
                                <>
                                  <span className={styles.hintText}>No responses yet</span>
                                  <span className={styles.suggestionText}>Consider sharing this survey</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={styles.nextAction}>{nextAction}</span>
                          </td>
                          <td>{new Date(survey.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className={styles.iconActions}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/surveys/${survey.id}/edit`)}
                                title={t('edit') || 'Edit'}
                              >
                                <LuPencil size={18} />
                              </Button>
                              {survey.status !== 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(survey, 'active')}
                                  title={t('activate') || 'Activate'}
                                >
                                  <LuPlay size={18} />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/surveys/${survey.id}/distribute`)}
                                title={t('distribute') || 'Distribute'}
                              >
                                <LuSend size={18} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/surveys/${survey.id}/results`)}
                                title={t('analytics_results') || 'Analytics & Results'}
                              >
                                <LuChartBar size={18} />
                              </Button>

                              {survey.status === 'archived' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSurveyToRestore(survey);
                                    setShowRestoreModal(true);
                                  }}
                                  title={t('restore') || 'Restore'}
                                >
                                  <LuRotateCcw size={18} />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(survey, 'archived')}
                                  title={t('archive') || 'Archive'}
                                  disabled={survey.status === 'archived' || survey.status === 'closed'}
                                >
                                  <LuArchive size={18} />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {paginationInfo.totalPages > 1 && (
                <div className={styles.paginationWrapper}>
                  <Pagination
                    currentPage={filterState.page}
                    totalPages={paginationInfo.totalPages}
                    totalItems={paginationInfo.totalItems}
                    itemsPerPage={filterState.limit}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}

          {/* Restore Confirmation Modal */}
          <ConfirmModal
            isOpen={showRestoreModal}
            onClose={() => {
              setShowRestoreModal(false);
              setSurveyToRestore(null);
            }}
            onConfirm={handleRestore}
            title={t('restore_survey') || "Restore Survey?"}
            message={t('restore_confirm') || "This will make the survey active again. Existing collectors will remain inactive and no links will be re-sent."}
            confirmText={t('restore') || "Restore"}
            confirmColor="primary"
          />

          <ConfirmModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSurveyToDelete(null);
            }}
            onConfirm={handleDelete}
            title={t('delete_survey') || "Delete Survey"}
            message={t('delete_confirm') || `Are you sure you want to delete "${surveyToDelete?.title}"? This action cannot be undone and will delete all associated responses.`}
            confirmText={t('delete')}
            confirmColor="danger"
          />

          {/* Bulk Delete Confirmation Modal */}
          <ConfirmModal
            isOpen={showBulkDeleteModal}
            onClose={() => setShowBulkDeleteModal(false)}
            onConfirm={handleBulkDelete}
            title="Delete Selected Surveys"
            message={`Are you sure you want to delete ${selectedSurveys.length} selected surveys? This action cannot be undone.`}
            confirmText={`Delete ${selectedSurveys.length} Surveys`}
            confirmColor="danger"
          />
        </>
      )
      }
    </div >
  );
};

export default SurveyList;
