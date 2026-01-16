const emailService = require('../../../utils/email.service');
const { SystemSetting } = require('../../../models');
const logger = require('../../../utils/logger');

class GmailController {

    /**
     * Start Connect Flow
     * GET /api/admin/gmail/connect
     */
    async connect(req, res) {
        try {
            const url = emailService.generateAuthUrl();
            // In a separate manual flow, we might redirect. 
            // But for an SPA, usually we return the URL and let frontend window.location.href = url
            // Or we can redirect directly if this is called via simple link.
            // Let's return JSON for flexibility.
            res.json({ url });
        } catch (error) {
            logger.error('Error generating auth url:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Handle OAuth Callback
     * GET /api/admin/gmail/callback?code=...
     */
    async callback(req, res) {
        try {
            const { code } = req.query;
            if (!code) {
                return res.status(400).send('Missing code');
            }

            await emailService.handleCallback(code);

            // Successful connection
            res.send(`
        <h1>Gmail Connected Successfully!</h1>
        <p>Return to the dashboard to send a test email.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      `);
        } catch (error) {
            logger.error('Callback error:', error);
            res.status(500).send(`<h1>Connection Failed</h1><p>${error.message}</p>`);
        }
    }

    /**
     * Check connection status
     * GET /api/admin/gmail/status
     */
    async status(req, res) {
        try {
            const setting = await SystemSetting.findByPk('GMAIL_REFRESH_TOKEN');
            const isConnected = !!setting && !!setting.value;

            res.json({
                connected: isConnected,
                sender: 'System Email (sender checked via implicit token)'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Send Test Email
     * POST /api/admin/gmail/test
     */
    async sendTestEmail(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ message: 'Email required' });

            await emailService.sendEmail(email, 'Test Email from ALLMTAGS', '<h1>It Works!</h1><p>This is a test email sent via Gmail API.</p>');
            res.json({ success: true, message: 'Test email sent' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new GmailController();
