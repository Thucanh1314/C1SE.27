// src/modules/surveys/controller/surveyInvite.controller.js
const surveyInviteService = require('../service/surveyInvite.service');
const notificationService = require('../../notifications/service/notification.service');
const { User } = require('../../../models');
const logger = require('../../../utils/logger');

class SurveyInviteController {
    /**
     * Create invites for a survey
     * POST /api/modules/surveys/:id/invites
     */
    async createInvites(req, res) {
        try {
            const { id: surveyId } = req.params;
            let { emails } = req.body;

            logger.info(`[SurveyInvite] Request to invite users to survey ${surveyId}`);

            // 1. Strict Request Contract & Normalization
            if (!emails || !Array.isArray(emails)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid request format. "emails" must be an array of strings.',
                    invalidEmails: []
                });
            }

            // Normalize: trim, lowercase, dedupe
            emails = [...new Set(emails.map(e => e.trim().toLowerCase()).filter(e => e))];

            if (emails.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No valid emails provided',
                    invalidEmails: []
                });
            }

            // 2. Validate Emails
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const validEmails = [];
            const invalidEmails = [];

            emails.forEach(email => {
                if (emailRegex.test(email)) {
                    validEmails.push(email);
                } else {
                    invalidEmails.push(email);
                }
            });

            if (validEmails.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'All provided emails are invalid',
                    invalidEmails
                });
            }

            // 3. Create Invites (Idempotent via Service)
            const invites = await surveyInviteService.createInvites(
                surveyId,
                validEmails,
                req.user.id
            );

            // 4. Notification Logic (Only for existing registered users)
            let registeredCount = 0;
            let guestCount = 0;
            const processedEmails = [];

            for (const invite of invites) {
                try {
                    // Check if user exists
                    const user = await User.findOne({ where: { email: invite.email } });

                    if (user) {
                        registeredCount++;
                        // Create Notification ONLY if user exists
                        // Get or create a collector is handled here or previously? 
                        // It's safer to ensure collector exists. logic is fine.
                        const { SurveyCollector } = require('../../../models');
                        let collector = await SurveyCollector.findOne({
                            where: { survey_id: surveyId, is_active: true }
                        });

                        if (!collector) {
                            const crypto = require('crypto');
                            collector = await SurveyCollector.create({
                                survey_id: surveyId,
                                name: 'Web Collector', // Standardize name
                                type: 'web_link',
                                token: crypto.randomBytes(16).toString('hex'),
                                is_active: true,
                                created_by: req.user.id
                            });
                        }

                        await notificationService.createNotification({
                            userId: user.id, // Ensure strict casing for service
                            type: 'survey_invitation',
                            title: 'Survey Invitation',
                            message: `You have been invited to participate in a survey`,
                            relatedSurveyId: surveyId, // Ensure strict casing
                            actionUrl: `/public/invite/${invite.token}`, // Direct action URL for click handling
                            data: {
                                invite_token: invite.token,
                                survey_id: surveyId,
                                collector_token: collector.token,
                                action_url: `/public/invite/${invite.token}` // Keep in data as backup
                            }
                        });
                    } else {
                        guestCount++;
                        // TODO: Integrate Email Service here to send "You are invited" email
                        // emailService.sendInvite(invite.email, invite.token, ...);
                        logger.info(`[SurveyInvite] Skipping in-app notification for guest email: ${invite.email}. Email would be sent here.`);
                    }
                    processedEmails.push(invite.email);

                } catch (innerError) {
                    logger.error(`[SurveyInvite] Error processing invite for ${invite.email}:`, innerError);
                    // Continue to next invite, don't fail batch
                }
            }

            // 5. Response
            res.status(201).json({
                success: true,
                message: `Processed ${invites.length} invites`,
                invited: invites.length,
                stats: {
                    registered: registeredCount,
                    guests: guestCount
                },
                details: {
                    processed: processedEmails,
                    invalid: invalidEmails
                }
            });

        } catch (error) {
            logger.error('Create invites error:', error);
            logger.error('Error stack:', error.stack);
            logger.error('Error details:', {
                surveyId: req.params.id,
                emails: req.body?.emails,
                userId: req.user?.id
            });
            res.status(500).json({
                success: false,
                message: error.message || 'Error creating invites',
                ...(process.env.NODE_ENV === 'development' && {
                    error: error.message,
                    stack: error.stack
                })
            });
        }
    }

    /**
     * Get all invites for a survey
     * GET /api/modules/surveys/:id/invites
     */
    async getInvites(req, res) {
        try {
            const { id: surveyId } = req.params;
            const invites = await surveyInviteService.getInvitesBySurvey(surveyId, req.user.id);

            res.status(200).json({
                success: true,
                data: { invites }
            });
        } catch (error) {
            logger.error('Get invites error:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message.includes('Access denied')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error fetching invites'
            });
        }
    }

    /**
     * Validate invite token (public endpoint)
     * GET /api/modules/invites/:token/validate
     */
    async validateInvite(req, res) {
        try {
            const { token } = req.params;
            logger.info(`Validating invite token: ${token}`);
            const invite = await surveyInviteService.validateInvite(token);

            res.status(200).json({
                success: true,
                data: {
                    valid: true,
                    survey: invite.survey,
                    email: invite.email
                }
            });
        } catch (error) {
            logger.error(`Validate invite error for token ${req.params.token}:`, error.message);
            res.status(400).json({
                success: false,
                message: error.message || 'Invalid invite token',
                data: { valid: false }
            });
        }
    }

    /**
     * Accept invite and get collector URL
     * POST /api/modules/invites/:token/accept
     */
    async acceptInvite(req, res) {
        try {
            const { token } = req.params;
            const invite = await surveyInviteService.validateInvite(token);

            // Get active collector
            const { SurveyCollector } = require('../../../models');
            const collector = await SurveyCollector.findOne({
                where: { survey_id: invite.survey_id, is_active: true }
            });

            if (!collector) {
                // If no collector, creating one on the fly might be risky for concurrency, 
                // but essential if not created during invite.
                // Reusing createInvites logic or assuming one exists. 
                // For now, fail if not found (should be found since createInvites ensures it).
                throw new Error('No active collector found to accept this invitation.');
            }

            // Return the redirect URL (frontend should handle the redirect)
            // We append the invite_token to track the response later
            res.status(200).json({
                success: true,
                data: {
                    redirect_url: `/public/response/${collector.token}?invite_token=${token}`
                }
            });
        } catch (error) {
            logger.error('Accept invite error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to accept invitation'
            });
        }
    }

    /**
     * Revoke/delete invite
     * DELETE /api/modules/invites/:id
     */
    async revokeInvite(req, res) {
        try {
            const { id } = req.params;
            await surveyInviteService.revokeInvite(id, req.user.id);

            res.status(200).json({
                success: true,
                message: 'Invite revoked successfully'
            });
        } catch (error) {
            logger.error('Revoke invite error:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message.includes('Access denied')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error revoking invite'
            });
        }
    }

    /**
     * Get invite statistics
     * GET /api/modules/surveys/:id/invites/stats
     */
    async getInviteStats(req, res) {
        try {
            const { id: surveyId } = req.params;
            const stats = await surveyInviteService.getInviteStats(surveyId, req.user.id);

            res.status(200).json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Get invite stats error:', error);

            if (error.message.includes('not found')) {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }

            if (error.message.includes('Access denied')) {
                return res.status(403).json({
                    success: false,
                    message: error.message
                });
            }

            res.status(500).json({
                success: false,
                message: error.message || 'Error fetching invite stats'
            });
        }
    }
}

module.exports = new SurveyInviteController();
