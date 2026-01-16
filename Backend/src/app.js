// src/app.js
// Express app configuration with middleware and route mounting
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const logger = require('./utils/logger');
const SocketService = require('./services/socketService');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const socketService = new SocketService();
socketService.initialize(server);

// Make socket service available to routes
app.set('socketService', socketService);

// Security middleware
app.use(helmet());

// CORS configuration with environment-based origins
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [process.env.FRONTEND_URL || 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Authorization'] // Expose Authorization header for JWT refresh
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger
app.use(morgan('dev'));

// Basic health check endpoint (legacy)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Mount modular routes at /api/modules
const moduleRoutes = require('./routes/modules.routes');
app.use('/api/modules', moduleRoutes);

// ALIAS: Mount /api/auth for Google OAuth compatibility (requested by frontend)
const authRoutes = require('./modules/auth-rbac/routes/auth.routes');
app.use('/api/auth', authRoutes);

// Context routes for borrowed powers and role-based UI
const contextRoutes = require('./modules/auth/routes/context.routes');
app.use('/api/auth', contextRoutes);

// Leave workspace routes
const leaveWorkspaceRoutes = require('./modules/workspaces/routes/leaveWorkspace.routes');
app.use('/api/workspaces', leaveWorkspaceRoutes);

// Advanced notification routes
const advancedNotificationRoutes = require('./modules/notifications/routes/advancedNotification.routes');
app.use('/api/notifications', advancedNotificationRoutes);

// Root route for compatibility
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the ALLMTAGS Survey API',
    version: '1.0.0',
    endpoints: {
      health: '/api/modules/health',
      modules: '/api/modules/*',
      documentation: 'See README.md for full API documentation'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  logger.error(err.stack);

  const status = err.status || err.statusCode || 500;
  const payload = {
    success: false,
    ok: false,
    error: true,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  res.status(status).json(payload);
});

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    ok: false,
    message: `Cannot ${req.method} ${req.path}`
  });
});

module.exports = { app, server, socketService };
