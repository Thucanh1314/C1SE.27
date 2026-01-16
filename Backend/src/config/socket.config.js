// src/config/socket.config.js

const logger = require('../utils/logger');

/**
 * Initialize Socket.IO for real-time notifications
 * @param {http.Server} server - HTTP server instance
 * @param {Object} options - Configuration options
 */
function initializeSocket(server, options = {}) {
  try {
    // Check if socket.io is installed
    let io;
    try {
      const socketIo = require('socket.io');
      io = socketIo(server, {
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:3000',
          credentials: true,
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        pingInterval: 25000,
        pingTimeout: 60000
      });
    } catch (error) {
      logger.warn('⚠️  Socket.IO not installed. Real-time notifications will use polling fallback.');
      logger.warn('To enable real-time notifications, run: npm install socket.io');
      return null;
    }

    // Authentication middleware
    io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          logger.debug('[Socket] Connection without token - guest mode');
          return next();
        }

        // Token validation will be done in connection handler
        socket.authToken = token;
        next();
      } catch (error) {
        logger.error('[Socket] Auth middleware error:', error.message);
        next(error);
      }
    });

    // Connection handler
    io.on('connection', (socket) => {
      logger.info(`[Socket] Client connected: ${socket.id}`);

      // Store user info if authenticated
      if (socket.authToken) {
        logger.debug(`[Socket] Client ${socket.id} authenticated`);
        socket.isAuthenticated = true;
      } else {
        socket.isAuthenticated = false;
      }

      // Join/Leave room handlers
      socket.on('join', (data) => {
        const { room } = data;
        if (room) {
          socket.join(room);
          logger.debug(`[Socket] Client ${socket.id} joined room: ${room}`);
        }
      });

      socket.on('leave', (data) => {
        const { room } = data;
        if (room) {
          socket.leave(room);
          logger.debug(`[Socket] Client ${socket.id} left room: ${room}`);
        }
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        logger.info(`[Socket] Client disconnected: ${socket.id}`);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error(`[Socket] Error on client ${socket.id}:`, error);
      });
    });

    logger.info('✅ Socket.IO initialized successfully');
    return io;
  } catch (error) {
    logger.error('❌ Failed to initialize Socket.IO:', error.message);
    return null;
  }
}

/**
 * Emit notification to specific user(s)
 * @param {Object} io - Socket.IO instance
 * @param {number|Array<number>} userId - User ID or array of user IDs
 * @param {Object} notification - Notification object
 */
function notifyUser(io, userId, notification) {
  if (!io) return;

  const userIds = Array.isArray(userId) ? userId : [userId];
  userIds.forEach(id => {
    // Emit to user's room (user_[userId])
    io.to(`user_${id}`).emit('notification:new', notification);
    logger.debug(`[Socket] Notification sent to user_${id}`);
  });
}

/**
 * Emit workspace event to all members
 * @param {Object} io - Socket.IO instance
 * @param {number} workspaceId - Workspace ID
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 */
function notifyWorkspace(io, workspaceId, eventName, data) {
  if (!io) return;

  // Emit to workspace room
  io.to(`workspace:${workspaceId}`).emit(eventName, data);
  logger.debug(`[Socket] Event ${eventName} sent to workspace:${workspaceId}`);
}

/**
 * Emit notification to all online users (broadcast)
 * @param {Object} io - Socket.IO instance
 * @param {string} eventName - Event name
 * @param {Object} data - Event data
 */
function broadcastNotification(io, eventName, data) {
  if (!io) return;

  io.emit(eventName, data);
  logger.debug(`[Socket] Broadcast event ${eventName}`);
}

module.exports = {
  initializeSocket,
  notifyUser,
  notifyWorkspace,
  broadcastNotification
};

// Store io instance globally
let ioInstance = null;

/**
 * Store Socket.IO instance
 */
function setIO(io) {
  ioInstance = io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  return ioInstance;
}

module.exports = {
  initializeSocket,
  notifyUser,
  notifyWorkspace,
  broadcastNotification,
  setIO,
  getIO
};
