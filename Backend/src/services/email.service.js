const nodemailer = require('nodemailer');
const logger = console; // Basic logger, replace with winston if available globally or import it

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || '"Support" <support@example.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const isDev = process.env.NODE_ENV !== 'production';

// Create a transporter
let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT == 465, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });
} else {
    logger.warn('⚠️ SMTP not configured. Emails will be logged to console only.');
}

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} token - Reset token
 */
const sendPasswordResetEmail = async (to, token) => {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    const subject = 'Password Reset Request';
    const text = `You requested a password reset. Please click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\nLink expires in 30 minutes.`;
    const html = `
    <h3>Password Reset Request</h3>
    <p>You requested a password reset. Please click the button below to reset your password:</p>
    <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
    <p>Or copy and paste this link into your browser:</p>
    <p>${resetLink}</p>
    <p>If you did not request this, please ignore this email.</p>
    <p><small>Link expires in 30 minutes.</small></p>
  `;

    if (!transporter) {
        if (isDev) {
            logger.info('To:', to);
            logger.info('Subject:', subject);
            logger.info('Reset Link:', resetLink);
            return true; // Simulate success
        }
        logger.error('Cannot send email: SMTP not configured');
        return false;
    }

    try {
        await transporter.sendMail({
            from: MAIL_FROM,
            to,
            subject,
            text,
            html,
        });
        logger.info(`Password reset email sent to ${to}`);
        return true;
    } catch (error) {
        logger.error('Error sending email:', error);
        return false;
    }
};

/**
 * Send welcome email
 * @param {string} to - Recipient email
 * @param {string} name - User's name
 */
const sendWelcomeEmail = async (to, name) => {
    const subject = 'Welcome to ALLMTAGS!';
    const text = `Hi ${name},\n\nWelcome to ALLMTAGS! We're excited to have you on board.\n\nYou can now start creating surveys and gathering insights.\n\nBest regards,\nThe ALLMTAGS Team`;
    const html = `
    <h3>Welcome to ALLMTAGS!</h3>
    <p>Hi ${name},</p>
    <p>Welcome to ALLMTAGS! We're excited to have you on board.</p>
    <p>You can now start creating surveys and gathering insights.</p>
    <br/>
    <p>Best regards,</p>
    <p><strong>The ALLMTAGS Team</strong></p>
  `;

    if (!transporter) {
        if (isDev) {
            logger.info('To:', to);
            logger.info('Subject:', subject);
            logger.info('Content:', text);
            return true;
        }
        logger.error('Cannot send welcome email: SMTP not configured');
        return false;
    }

    try {
        await transporter.sendMail({
            from: MAIL_FROM,
            to,
            subject,
            text,
            html,
        });
        logger.info(`Welcome email sent to ${to}`);
        return true;
    } catch (error) {
        logger.error('Error sending welcome email:', error);
        return false;
    }
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
};
