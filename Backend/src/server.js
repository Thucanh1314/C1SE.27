// src/server.js
// Server entry point - starts the Express app with Socket.IO
require('dotenv').config();
const { app, server, socketService } = require('./app');
const logger = require('./utils/logger');
const schedulerService = require('./utils/scheduler.service');

// Validate required environment variables with defaults
const requiredEnvVars = {
  DB_HOST: 'localhost',
  DB_USER: 'root',
  DB_PASSWORD: '',
  DB_NAME: 'allmtags_survey_db',
  JWT_SECRET: 'unsafe-dev-secret-please-change-in-production',
  PORT: '5000',
  FRONTEND_URL: 'http://localhost:3000',
  NODE_ENV: 'development'
};

const missingCritical = [];
Object.keys(requiredEnvVars).forEach(varName => {
  if (!process.env[varName]) {
    const defaultValue = requiredEnvVars[varName];
    if (['JWT_SECRET', 'DB_PASSWORD'].includes(varName) && process.env.NODE_ENV === 'production') {
      missingCritical.push(varName);
    } else {
      process.env[varName] = defaultValue;
      logger.warn(`  ${varName} not set, using default: ${varName === 'DB_PASSWORD' ? '(empty)' : defaultValue}`);
    }
  }
});

if (missingCritical.length > 0) {
  logger.error(` Missing critical environment variables in production: ${missingCritical.join(', ')}`);
  logger.error('Please set these in your .env file. See .env.example for reference.');
  process.exit(1);
}

// Google OAuth Guard
const googleRedirectUri = process.env.GOOGLE_AUTH_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI || `http://localhost:${process.env.PORT || 5000}/api/auth/google/callback`;
if (!googleRedirectUri.startsWith('http')) {
  logger.error(` Invalid Google OAuth Redirect URI: ${googleRedirectUri}`);
  logger.error('Please check GOOGLE_AUTH_CALLBACK_URL or GOOGLE_REDIRECT_URI in .env');
  // Optional: process.exit(1) if strict
}

const PORT = process.env.PORT;

// Socket.IO is already initialized in app.js
const io = socketService ? socketService.io : null;

// Make io accessible globally for use in controllers/services
app.set('io', io);

const serverInstance = server.listen(PORT, async () => {
  logger.info(` Server running on port ${PORT}`);
  logger.info(` Environment: ${process.env.NODE_ENV || 'development'}`);

  // Test database connection
  try {
    const { sequelize } = require('./models');
    if (sequelize) {
      await sequelize.authenticate();
      const config = sequelize.config;
      logger.info(` Database connection established successfully.`);
      logger.info(`[DB] connected to ${config.host}:${config.port}/${config.database}`);

      // Count users
      const { User } = require('./models');
      const userCount = await User.count();
      logger.info(`[USERS] total users in DB = ${userCount}`);

      // Check for pending migrations
      const queryInterface = sequelize.getQueryInterface();

      const tables = await queryInterface.showAllTables();
      if (tables.length === 0) {
        logger.warn('  Database appears empty. Run migrations: npm run migrate');
      }
    }
  } catch (error) {
    logger.error(' Database connection failed:', error.message);
    logger.error('Please check your database configuration.');
  }

  logger.info(`\n API Endpoints:`);
  logger.info(`   Health: http://localhost:${PORT}/api/modules/health`);
  logger.info(`   Auth: http://localhost:${PORT}/api/modules/auth/*`);
  logger.info(`   Users: http://localhost:${PORT}/api/modules/users/*`);
  logger.info(`   Templates: http://localhost:${PORT}/api/modules/templates/*`);
  logger.info(`   Surveys: http://localhost:${PORT}/api/modules/surveys/*`);
  logger.info(`   Collectors: http://localhost:${PORT}/api/modules/collectors/*`);
  logger.info(`   Responses: http://localhost:${PORT}/api/modules/responses/*`);
  logger.info(`   Analytics: http://localhost:${PORT}/api/modules/analytics/*`);
  if (io) {
    logger.info(`\n WebSocket: ws://localhost:${PORT}/socket.io`);
  }

  // Log Google OAuth Configuration (for debugging redirect_uri_mismatch)
  const googleRedirectUri = process.env.GOOGLE_AUTH_CALLBACK_URL || `http://localhost:${PORT}/api/auth/google/callback`;
  logger.info(` Google OAuth Redirect URI: ${googleRedirectUri}`);
  logger.info(`   (Ensure this EXACT URL is added to Google Cloud Console > APIs & Services > Credentials > Authorized redirect URIs)`);

  // Initialize Scheduler
  schedulerService.init();

  // Initialize System Cron Jobs (New)
  const cronService = require('./modules/system/service/cron.service');
  cronService.startAllJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  serverInstance.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  serverInstance.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

module.exports = server;
