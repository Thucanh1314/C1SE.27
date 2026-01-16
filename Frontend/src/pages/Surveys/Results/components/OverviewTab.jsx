import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import AnalyticsService from '../../../../api/services/analytics.service';
import Loader from '../../../../components/common/Loader/Loader';
import DropOffChart from './DropOffChart';
import QualityScoreCard from '../../../../components/Analytics/QualityScoreCard'; // Verify path
import { LuChartBar, LuCircleCheck, LuClock, LuArrowDownRight } from 'react-icons/lu';
import styles from '../Results.module.scss';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const OverviewTab = ({ surveyId, filters }) => {
    const [loading, setLoading] = useState(true);
    const [overviewData, setOverviewData] = useState(null);
    const [qualityData, setQualityData] = useState(null);
    const [dropOffData, setDropOffData] = useState(null);

    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Use Promise.allSettled to allow independent failures
                const results = await Promise.allSettled([
                    AnalyticsService.getOverview(surveyId, filters, { signal }),
                    AnalyticsService.getQualityScore(surveyId, { signal }),
                    AnalyticsService.getDropOffAnalysis(surveyId, filters, { signal })
                ]);

                const [overviewResult, qualityResult, dropOffResult] = results;

                // Handle Overview
                if (overviewResult.status === 'fulfilled') {
                    setOverviewData(overviewResult.value);
                } else {
                    console.warn('Overview fetch failed:', overviewResult.reason);
                    // Critical failure - might want to keep overviewData null to show error
                }

                // Handle Quality Score - Non-critical
                if (qualityResult.status === 'fulfilled') {
                    setQualityData(qualityResult.value);
                } else {
                    console.warn('Quality fetch failed:', qualityResult.reason);
                    setQualityData({ totalScore: 0, factors: [] }); // Fallback
                }

                // Handle Drop Off - Non-critical
                if (dropOffResult.status === 'fulfilled') {
                    setDropOffData(dropOffResult.value);
                } else {
                    if (dropOffResult.reason?.response?.status === 404) {
                        console.info('Drop-off endpoint not found (404). Backend update needed.');
                    } else {
                        console.warn('Drop-off fetch failed:', dropOffResult.reason);
                    }
                    setDropOffData(null); // Fallback
                }

            } catch (error) {
                if (error.name !== 'CanceledError') {
                    console.error('Failed to fetch analytics data:', error);
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchAllData();

        return () => controller.abort();
    }, [surveyId, filters]);

    if (loading) return <Loader />;

    // Check if no data or 0 responses
    if (!overviewData || overviewData.totalResponses === 0) {
        return (
            <div className={styles.tabContent}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <LuChartBar size={48} color="#94a3b8" />
                    </div>
                    <h3>No Responses Yet</h3>
                    <p>Your survey hasn't received any responses yet. Distribute it to start analyzing data.</p>
                </div>
            </div>
        );
    }

    // Prepare Line Chart Data
    const chartData = {
        labels: overviewData.timeSeries ? overviewData.timeSeries.map(item => item.date) : [],
        datasets: [
            {
                label: 'Responses',
                data: overviewData.timeSeries ? overviewData.timeSeries.map(item => item.count) : [],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                tension: 0.3
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Responses Over Time' },
        },
    };

    return (
        <div className={styles.tabContent}>



            {/* Top Level Stats */}
            <div className={styles.statsOverview}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <LuChartBar size={24} color="#64748b" />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statNumber}>{overviewData.totalResponses}</div>
                        <div className={styles.statLabel}>Total Responses</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <LuCircleCheck size={24} color="#64748b" />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statNumber}>{overviewData.completionRate}%</div>
                        <div className={styles.statLabel}>Completion Rate</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <LuClock size={24} color="#64748b" />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statNumber}>
                            {overviewData.avgTimeSeconds ? `${Math.round(overviewData.avgTimeSeconds)}s` : <span style={{ fontSize: '0.6em', color: '#94a3b8' }}>N/A</span>}
                        </div>
                        <div className={styles.statLabel}>Avg Time</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <LuArrowDownRight size={24} color="#64748b" />
                    </div>
                    <div className={styles.statContent}>
                        <div className={styles.statNumber}>{overviewData.dropOffResponses}</div>
                        <div className={styles.statLabel}>Drop-offs</div>
                    </div>
                </div>
            </div>

            {/* Quality Score Card */}
            <div className={styles.sectionMargin}>
                <QualityScoreCard
                    data={qualityData}
                    loading={false}
                    responseCount={overviewData.totalResponses}
                />
            </div>

            {/* Charts Row */}
            <div className={styles.chartsGrid}>
                <div className={styles.chartSection}>
                    <h3>Response Trend</h3>
                    <div className={styles.chartContainer}>
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>

                {/* Drop Off Chart */}
                <div className={styles.chartSection}>
                    <DropOffChart data={dropOffData} />
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;
