import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useToast } from '../../../contexts/ToastContext';
import AnalyticsService from '../../../api/services/analytics.service';
import StatCard from '../../../components/UI/StatCard';
import ChartCard from '../../../components/UI/ChartCard';
import Loader from '../../../components/common/Loader/Loader';
import styles from './CreatorDashboard.module.scss';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const CreatorDashboard = () => {
  const navigate = useNavigate();
  const { showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalSurveys: 0,
    activeSurveys: 0,
    closedSurveys: 0,
    draftSurveys: 0
  });
  const [statusDistribution, setStatusDistribution] = useState({
    draft: 0,
    active: 0,
    closed: 0
  });

  const fetchCreatorData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats from backend
      const stats = await AnalyticsService.getCreatorDashboard();

      // stats = { totalSurveys, activeSurveys, draftSurveys, closedSurveys }
      setSummary({
        totalSurveys: stats.totalSurveys || 0,
        activeSurveys: stats.activeSurveys || 0,
        closedSurveys: stats.closedSurveys || 0,
        draftSurveys: stats.draftSurveys || 0
      });

      setStatusDistribution({
        draft: stats.draftSurveys || 0,
        active: stats.activeSurveys || 0,
        closed: stats.closedSurveys || 0
      });

    } catch (error) {
      console.error('Error fetching creator data:', error);
      showError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchCreatorData();
  }, [fetchCreatorData]);

  // Chart configuration
  const statusChartData = {
    labels: ['Draft', 'Active', 'Closed'],
    datasets: [
      {
        data: [statusDistribution.draft, statusDistribution.active, statusDistribution.closed],
        backgroundColor: [
          'rgba(156, 163, 175, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(156, 163, 175, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const statusChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Creator Dashboard</h1>
        </div>
        <Loader fullScreen message="Loading dashboard data..." />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Creator Dashboard</h1>
          <p className={styles.subtitle}>Manage your surveys and view analytics</p>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.actionButton}
            onClick={() => navigate('/workspaces')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 3h5v5H3V3zm9 0h5v5h-5V3zm-9 9h5v5H3v-5zm9 0h5v5h-5v-5z" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
            My Workspaces
          </button>
          <button
            className={styles.actionButton}
            onClick={() => navigate('/analytics')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 17V10M10 17V3M17 17v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            View Analytics
          </button>
          <button
            className={styles.actionButton}
            onClick={() => navigate('/surveys')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 3h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            View Responses
          </button>
          <button
            className={styles.primaryButton}
            onClick={() => navigate('/templates')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 5v10M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Create Survey
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <StatCard
          icon="📊"
          title="Total Surveys"
          value={summary.totalSurveys}
          color="primary"
        />
        <StatCard
          icon="🟢"
          title="Active Surveys"
          value={summary.activeSurveys}
          color="success"
        />
        <StatCard
          icon="🔴"
          title="Closed Surveys"
          value={summary.closedSurveys}
          color="danger"
        />
        <StatCard
          icon="📝"
          title="Draft Surveys"
          value={summary.draftSurveys}
          color="info"
        />
      </div>

      {/* Status Distribution Chart */}
      <div className={styles.chartSection}>
        <ChartCard
          title="Survey Status Distribution"
          description="Overview of your surveys by status"
        >
          <Doughnut data={statusChartData} options={statusChartOptions} />
        </ChartCard>

        {/* Quick Actions Card */}
        <div className={styles.quickActions}>
          <h3 className={styles.quickActionsTitle}>Quick Actions</h3>
          <div className={styles.actionsList}>
            <button
              className={styles.quickActionItem}
              onClick={() => navigate('/templates')}
            >
              <div className={styles.quickActionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>Create Template</h4>
                <p>Start with a new survey template</p>
              </div>
              <svg className={styles.quickActionArrow} width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className={styles.quickActionItem}
              onClick={() => navigate('/surveys')}
            >
              <div className={styles.quickActionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>Manage Surveys</h4>
                <p>View and edit your surveys</p>
              </div>
              <svg className={styles.quickActionArrow} width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className={styles.quickActionItem}
              onClick={() => navigate('/collectors')}
            >
              <div className={styles.quickActionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="2" />
                  <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>Generate Collector</h4>
                <p>Create QR codes and links</p>
              </div>
              <svg className={styles.quickActionArrow} width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className={styles.quickActionItem}
              onClick={() => navigate('/analytics')}
            >
              <div className={styles.quickActionIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 20V12M12 20V4M20 20v-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div className={styles.quickActionContent}>
                <h4>View Analytics</h4>
                <p>Analyze survey results</p>
              </div>
              <svg className={styles.quickActionArrow} width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorDashboard;
