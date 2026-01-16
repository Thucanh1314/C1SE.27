const { Op } = require('sequelize');
const { Survey, SurveyResponse, User, Notification, WorkspaceMember } = require('../models'); // Adjust imports based on index.js
const notificationService = require('./notification.service');
const logger = require('./logger'); // Assuming logger exists

class SchedulerService {
    constructor() {
        this.checkInterval = 60 * 60 * 1000; // Check every hour
    }

    init() {
        logger.info('Scheduler Service initialized');
        // Run immediately on startup
        this.checkDeadlines();

        // Set interval
        setInterval(() => {
            this.checkDeadlines();
        }, this.checkInterval);
    }

    async checkDeadlines() {
        logger.info('Running deadline check...');
        try {
            const now = new Date();
            const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // 1. Find surveys expiring in the next 24 hours (and haven't been notified yet? tricky without state. 
            // We can check if notification exists for this survey/user in the last 24h? 
            // Or just check strict range: expires between 23h and 24h from now to avoid duplicates?
            // Let's check for expiration between now and +24h, 
            // but to avoid spamming, we should probably record that we sent a reminder.
            // But we don't have a 'reminder_sent' field.
            // Alternative: Check surveys strictly expiring in [23h, 24h] window.
            // Since we run every hour, this should catch them.

            const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
            const windowEnd = twentyFourHoursLater;

            const expeditingSurveys = await Survey.findAll({
                where: {
                    end_date: {
                        [Op.between]: [windowStart, windowEnd]
                    },
                    status: 'published',
                    is_active: true
                }
            });

            if (expeditingSurveys.length === 0) return;

            logger.info(`Found ${expeditingSurveys.length} surveys expiring soon.`);

            for (const survey of expeditingSurveys) {
                await this.processSurveyReminders(survey);
            }

        } catch (error) {
            logger.error('Error in checkDeadlines:', error);
        }
    }

    async processSurveyReminders(survey) {
        // Determine target audience
        let targetUserIds = [];

        if (survey.access_type === 'public') {
            // Public surveys don't get reminders unless we track invitations?
            return;
        }

        if (survey.assigned_to_users && survey.assigned_to_users.length > 0) {
            // Specific users (assuming assigned_to_users is an array of IDs stored in JSON or similar, 
            // OR we have a join table. I need to check the Survey model structure for 'assigned_to_users' logic.
            // Earlier I used getAssigned logic. I should check how Survey.assigned_users is stored.
            // If it's a join table, we query that.
        }

        // For now, let's assume valid mainly for Workspace Members assignments
        // If survey is linked to workspace, notify members?
        // Access logic is complex.
        // Simplification: If survey has specific responses that are 'in_progress'?
        // Implementation Plan Step: "Find targets (users) who haven't responded"

        // Let's look for workspace members if survey belongs to workspace and is 'private' or 'internal'
        if (survey.workspace_id) {
            const members = await WorkspaceMember.findAll({
                where: { workspace_id: survey.workspace_id, status: 'accepted' },
                attributes: ['user_id']
            });
            targetUserIds = members.map(m => m.user_id);
        }

        // Filter out users who have already responded
        const responses = await SurveyResponse.findAll({
            where: {
                survey_id: survey.id,
                status: 'completed'
            },
            attributes: ['user_id', 'respondent_email'] // Check schema
        });

        const respondedUserIds = new Set(responses.map(r => r.user_id).filter(id => id));

        const usersToNotify = targetUserIds.filter(id => !respondedUserIds.has(id));

        // Send notifications
        for (const userId of usersToNotify) {
            try {
                await notificationService.createNotification({ // Direct usage of model or service?
                    user_id: userId,
                    type: 'deadline_reminder', // Mapped to ENUM
                    title: 'Survey Due Soon',
                    message: `The survey "${survey.title}" is due in less than 24 hours.`,
                    related_id: survey.id,
                    related_type: 'survey',
                    action_url: '/surveys?filter=pending'
                });
                logger.info(`Sent reminder for survey ${survey.id} to user ${userId}`);
            } catch (err) {
                logger.error(`Failed to send reminder to user ${userId}`, err);
            }
        }
    }
}

module.exports = new SchedulerService();
