const cron = require('node-cron');
const { SurveyResponse, Answer } = require('../../../models');
const { Op } = require('sequelize');
const sequelize = require('../../../config/database');

class CronService {
    constructor() {
        this.cleanupJob = null;
    }

    /**
     * Start all system cron jobs
     */
    startAllJobs() {
        console.log('[CronService] Initializing system cron jobs...');
        this.startCleanupJob();
    }

    /**
     * Daily Cleanup Job (Runs at 00:00)
     * Deletes "Ghost" sessions: Anonymous, In Progress, > 24h old, No Answers
     */
    startCleanupJob() {
        // Schedule: 0 0 * * * (Every day at midnight)
        this.cleanupJob = cron.schedule('0 0 * * *', async () => {
            console.log('[CronService] 🧹 Starting daily cleanup of ghost sessions...');
            try {
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

                // 1. Find Ghost Sessions
                // Logic:
                // - Status: 'in_progress'
                // - Created: > 24h ago
                // - Anonymous: true
                // - Respondent ID: NULL (Double check)
                // - Answers: NONE (Count = 0)

                const ghostSessions = await SurveyResponse.findAll({
                    where: {
                        status: 'in_progress',
                        created_at: { [Op.lt]: twentyFourHoursAgo },
                        is_anonymous: true,
                        respondent_id: null
                    },
                    include: [{
                        model: Answer,
                        attributes: ['id'],
                        required: false
                    }],
                    // We only want those with NO answers
                    // Verify logic: simple filter after fetch or subquery?
                    // Fetching all might be heavy if massive spam. 
                    // Better to use DELETE with subquery if possible, or filter in JS if volume reasonable.
                    // Let's filter in JS for safety first (logic clarity).
                });

                const idsToDelete = ghostSessions
                    .filter(r => !r.Answers || r.Answers.length === 0)
                    .map(r => r.id);

                if (idsToDelete.length > 0) {
                    await SurveyResponse.destroy({
                        where: {
                            id: { [Op.in]: idsToDelete }
                        }
                    });
                    console.log(`[CronService] ✅ Deleted ${idsToDelete.length} ghost sessions.`);
                } else {
                    console.log('[CronService] No ghost sessions found to delete.');
                }

            } catch (error) {
                console.error('[CronService] ❌ Error during cleanup job:', error);
            }
        });

        console.log('[CronService] Daily cleanup job scheduled (00:00).');
    }
}

module.exports = new CronService();
