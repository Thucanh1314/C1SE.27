import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaChartBar, FaFileAlt, FaRobot } from 'react-icons/fa';
import AnalyticsService from '../../api/services/analytics.service';
import styles from './Analytics.module.scss';
import LoadingSpinner from '../../components/LoadingSpinner/LoadingSpinner';

const Analytics = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [surveys, setSurveys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dashboardData] = await Promise.all([
                AnalyticsService.getAdminDashboard()
            ]);

            // Assuming dashboardData structure based on typical response
            setStats(dashboardData.stats);
            // If the API returns surveys list in the dashboard data
            setSurveys(dashboardData.surveys || []);
            // If not, we might need a separate call to SurveyService.getAll() but let's stick to AnalyticsService for now relative to the plan
        } catch (err) {
            console.error("Error fetching analytics data:", err);
            setError("Không thể tải dữ liệu phân tích.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
    };

    const filteredSurveys = surveys.filter(survey =>
        survey.title?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <LoadingSpinner />;
    if (error) return <div className={styles.error}>{error}</div>;

    return (
        <div className={styles.analyticsPage}>
            <div className={styles.header}>
                <h1 className={styles.title}>Phân Tích & Báo Cáo</h1>
                <p className={styles.subtitle}>Tổng hợp dữ liệu và thông tin chi tiết từ các khảo sát của bạn</p>
            </div>

            {/* Summary Metrics Strip */}
            <div className={styles.summaryStrip}>
                <div className={styles.metric}>
                    <div className={styles.metricNumber}>{stats?.totalSurveys || surveys.length}</div>
                    <div className={styles.metricLabel}>Surveys</div>
                </div>
                <div className={styles.metricDivider}>·</div>
                <div className={styles.metric}>
                    <div className={styles.metricNumber}>{stats?.totalResponses || 0}</div>
                    <div className={styles.metricLabel}>Total Responses</div>
                </div>
            </div>

            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <FaSearch />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Tìm kiếm báo cáo khảo sát..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
                <div className={styles.resultCount}>
                    {filteredSurveys.length} kết quả
                </div>
            </div>

            {filteredSurveys.length > 0 ? (
                <div className={styles.grid}>
                    {filteredSurveys.map(item => (
                        <div key={item.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.date}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </div>
                                {/* Status badge could go here */}
                            </div>

                            <h3 className={styles.cardTitle}>{item.title}</h3>
                            <p className={styles.cardDescription}>
                                {item.description || 'Chưa có mô tả cho khảo sát này.'}
                            </p>

                            <div className={styles.statsRow}>
                                <div className={styles.stat}>
                                    <span className={styles.statValue}>{item.responseCount || 0}</span>
                                    <span className={styles.statLabel}>Phản hồi</span>
                                </div>
                                <div className={styles.stat}>
                                    <span className={styles.statValue}>
                                        {item.completionRate ? `${item.completionRate}%` : 'N/A'}
                                    </span>
                                    <span className={styles.statLabel}>Hoàn thành</span>
                                </div>
                            </div>

                            <button
                                className={styles.viewButton}
                                onClick={() => navigate(`/surveys/${item.id}/results`)}
                            >
                                <FaChartBar /> Xem báo cáo
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📊</div>
                    <h3>Chưa có dữ liệu nào</h3>
                    <p>Không tìm thấy khảo sát nào phù hợp với tìm kiếm của bạn.</p>
                    <button className={styles.emptyButton} onClick={fetchData}>
                        Tải lại dữ liệu
                    </button>
                </div>
            )}
        </div>
    );
};

export default Analytics;
