import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import CollectorService from '../../../api/services/collector.service';
import SurveyService from '../../../api/services/survey.service';
import Loader from '../../../components/common/Loader/Loader';
import Pagination from '../../../components/common/Pagination/Pagination';
import Modal from '../../../components/common/Modal/Modal';
import ConfirmModal from '../../../components/UI/ConfirmModal';
import { useToast } from '../../../contexts/ToastContext';
import styles from './CollectorList.module.scss';

const CollectorList = () => {
  const [searchParams] = useSearchParams();
  const preselectedSurvey = searchParams.get('survey');
  const { showToast } = useToast();

  const [collectors, setCollectors] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCollector, setSelectedCollector] = useState(null);
  const [formData, setFormData] = useState({
    survey_id: preselectedSurvey || '',
    expires_at: '',
  });
  const itemsPerPage = 10;

  const fetchCollectors = useCallback(async (surveyList) => {
    try {
      setLoading(true);
      // Fetch collectors for all surveys
      const allCollectors = [];
      for (const survey of surveyList) {
        try {
          const collectors = await CollectorService.getBySurvey(survey.id);
          // Add survey info to each collector
          allCollectors.push(...collectors.map(c => ({ ...c, survey })));
        } catch (error) {
          console.error(`Failed to fetch collectors for survey ${survey.id}:`, error);
        }
      }
      setCollectors(allCollectors);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch collectors', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      // Fetch surveys first
      try {
        const surveyData = await SurveyService.getAll();
        const surveys = surveyData.surveys || [];
        // Only exclude Draft surveys from the collector list
        const visibleSurveys = surveys.filter(s => s.status !== 'draft');
        setSurveys(surveys.filter(s => s.status === 'active')); // For dropdown, keep only active? Or maybe visible too? Let's use visible for list.

        // Use visibleSurveys for fetching collectors
        await fetchCollectors(visibleSurveys);
      } catch (error) {
        showToast('Failed to initialize page', 'error');
        setLoading(false);
      }
    };

    init();

    // Auto-refresh every 30 seconds - fetch latest surveys each time
    const interval = setInterval(async () => {
      try {
        const surveyData = await SurveyService.getAll();
        const surveys = surveyData.surveys || [];
        const visibleSurveys = surveys.filter(s => s.status !== 'draft');
        // Update state for dropdown if needed, though usually we might want to keep it strictly active
        // But let's keep consistency with the initial load
        setSurveys(surveys.filter(s => s.status === 'active'));
        await fetchCollectors(visibleSurveys);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchCollectors, showToast]);

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!formData.survey_id) {
      showToast('Please select a survey', 'error');
      return;
    }

    try {
      await CollectorService.create(formData);
      showToast('Collector generated successfully', 'success');
      setShowGenerateModal(false);
      setFormData({ survey_id: '', expires_at: '' });
      fetchCollectors(surveys);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to generate collector', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedCollector) return;

    try {
      await CollectorService.deleteCollector(selectedCollector.id);
      showToast('Collector deleted successfully', 'success');
      setShowDeleteModal(false);
      setSelectedCollector(null);
      fetchCollectors(surveys);
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to delete collector', 'error');
    }
  };

  const openQRModal = (collector) => {
    setSelectedCollector(collector);
    setShowQRModal(true);
  };

  const openDeleteModal = (collector) => {
    setSelectedCollector(collector);
    setShowDeleteModal(true);
  };

  const getPublicLink = (token) => {
    return `${window.location.origin}/responses/public/${token}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard', 'success');
  };

  const getCollectorStatus = (collector) => {
    // 1. Check survey status first
    if (collector.survey?.status === 'closed' || collector.survey?.status === 'analyzed') {
      return { label: 'Closed', class: styles.expired };
    }

    // 2. Check expiration
    if (collector.survey?.end_date && new Date(collector.survey.end_date) < new Date()) {
      return { label: 'Expired', class: styles.expired };
    }

    // 3. Active
    return { label: 'Active', class: styles.active };
  };

  const totalPages = Math.ceil(collectors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCollectors = collectors.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <Loader />;

  return (
    <div className={styles.collectorList}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Survey Collectors</h1>
          <p className={styles.subtitle}>Generate and manage public survey links</p>
        </div>
        <button
          className={styles.generateButton}
          onClick={() => setShowGenerateModal(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Generate Collector
        </button>
      </div>

      {collectors.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <h3>No collectors found</h3>
          <p>Generate a collector to create a public survey link</p>
          <button
            className={styles.emptyButton}
            onClick={() => setShowGenerateModal(true)}
          >
            Generate Collector
          </button>
        </div>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Survey</th>
                  <th>Token</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Responses</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentCollectors.map((collector) => (
                  <tr key={collector.id}>
                    <td>
                      <span className={styles.surveyName}>
                        {collector.survey?.title || `Survey #${collector.survey_id}`}
                      </span>
                    </td>
                    <td>
                      <code className={styles.token} title={collector.token}>
                        {collector.token.substring(0, 12)}...
                      </code>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${getCollectorStatus(collector).class}`}>
                        {getCollectorStatus(collector).label}
                      </span>
                    </td>
                    <td>{new Date(collector.created_at).toLocaleDateString()}</td>
                    <td>{collector.survey?.end_date ? new Date(collector.survey.end_date).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <span className={styles.responseCount}>{collector.response_count || 0}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          onClick={() => copyToClipboard(getPublicLink(collector.token))}
                          className={styles.copyButton}
                          title="Copy link"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openQRModal(collector)}
                          className={styles.qrButton}
                          title="View QR code"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="7" height="7" />
                            <rect x="14" y="3" width="7" height="7" />
                            <rect x="14" y="14" width="7" height="7" />
                            <rect x="3" y="14" width="7" height="7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(collector)}
                          className={styles.deleteButton}
                          title="Delete collector"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Generate Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Collector"
      >
        <form onSubmit={handleGenerate} className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label>Select Survey *</label>
            <select
              value={formData.survey_id}
              onChange={(e) => setFormData({ ...formData, survey_id: e.target.value })}
              required
            >
              <option value="">Choose a survey...</option>
              {surveys.map(survey => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
            {surveys.length === 0 && (
              <p className={styles.hint}>No active surveys available</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>Expiration Date (Optional)</label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className={styles.hint}>Leave empty for no expiration</p>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={() => setShowGenerateModal(false)} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" className={styles.submitButton}>
              Generate
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="QR Code"
      >
        {selectedCollector && (
          <div className={styles.qrContainer}>
            <div className={styles.qrCode}>
              <QRCodeSVG
                value={getPublicLink(selectedCollector.token)}
                size={256}
                level="H"
                includeMargin
              />
            </div>
            <div className={styles.linkBox}>
              <input
                type="text"
                value={getPublicLink(selectedCollector.token)}
                readOnly
                className={styles.linkInput}
              />
              <button
                onClick={() => copyToClipboard(getPublicLink(selectedCollector.token))}
                className={styles.copyLinkButton}
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCollector(null);
        }}
        onConfirm={handleDelete}
        title="Delete Collector"
        message="Are you sure you want to delete this collector? The public link will no longer work."
        confirmText="Delete"
        confirmColor="danger"
      />
    </div>
  );
};

export default CollectorList;
