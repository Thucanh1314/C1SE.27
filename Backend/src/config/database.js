// src/config/database.js
const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'llm_survey_db',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

// Log database connection attempt (without password)
logger.info('Attempting MySQL connection...', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  username: dbConfig.username
});

// Configure Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 60000,
      charset: 'utf8mb4'
    },
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    }
  }
);

// Test connection
sequelize
  .authenticate()
  .then(() => {
    logger.info(' MySQL connection established successfully', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database
    });
  })
  .catch((err) => {
    logger.error(' Unable to connect to MySQL database', {
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      error: err.message
    });
    logger.error(' Check if MySQL is running at the configured host:port');
    logger.error(' For Docker: docker-compose up -d');
    logger.error(' For local MySQL: verify DB_HOST and DB_PORT in .env');
  });

module.exports = sequelize;
