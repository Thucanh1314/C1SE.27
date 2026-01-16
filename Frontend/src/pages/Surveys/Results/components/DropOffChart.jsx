import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styles from './Analytics.module.scss';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const DropOffChart = ({ data }) => {
    // New data structure: { steps: [{ step, viewCount, dropOffCount, dropOffRate, completionRate }] }
    // Or old structure fallback?

    // Check if data is valid
    const steps = data?.steps || (Array.isArray(data) ? data : []);

    if (!steps || steps.length === 0) return <div className={styles.noData}>No drop-off data available</div>;

    const chartData = {
        labels: steps.map(d => {
            const label = d.step || d.questionText || `Step ${d.order || '?'}`;
            return label.length > 20 ? label.substring(0, 20) + '...' : label;
        }),
        datasets: [
            {
                label: 'Respondents',
                data: steps.map(d => d.viewCount || d.reachedCount || d.answerCount || 0), // Support viewCount/reachedCount/answerCount
                backgroundColor: 'rgba(20, 184, 166, 0.6)',
                borderColor: 'rgba(20, 184, 166, 1)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Drop-off Funnel (Respondents Reaching Step)',
            },
            tooltip: {
                callbacks: {
                    afterLabel: function (context) {
                        const index = context.dataIndex;
                        const item = steps[index];
                        let label = `Count: ${item.viewCount || item.reachedCount || item.answerCount || 0}`;
                        if (item.dropOffRate !== undefined) {
                            label += ` | Drop-off: ${item.dropOffRate}%`;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Responses'
                },
                ticks: {
                    stepSize: 1, // Force integer steps
                    precision: 0 // No decimals
                }
            }
        }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3>Drop-off Analysis</h3>
            </div>
            <div className={styles.chartContainer}>
                <Bar options={options} data={chartData} />
            </div>
            <div className={styles.insight}>
                <strong>Insight: </strong>
                Identify questions with significant drops in response count. These may be too difficult, sensitive, or irrelevant.
            </div>
        </div>
    );
};

export default DropOffChart;
