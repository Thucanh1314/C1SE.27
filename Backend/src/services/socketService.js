// src/services/socketService.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.userSockets = new Map(); // socketId -> userId mapping
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    // Share with global config for other services to use
    try {
      const socketConfig = require('../config/socket.config');
      if (socketConfig && typeof socketConfig.setIO === 'function') {
        socketConfig.setIO(this.io);
      }
    } catch (err) {
      logger.warn('[SocketService] Could not share IO with socket.config');
    }

    this.setupSocketHandlers();
    logger.info('🔌 Socket.IO server initialized');
  }

  /**
   * Setup socket event handlers
   */
  setupSocketHandlers() {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      const userId = socket.userId;

      // Map user to socket
      this.connectedUsers.set(userId, socket.id);
      this.userSockets.set(socket.id, userId);

      logger.info(`👤 User ${userId} connected via Socket.IO`);

      // Join user to their personal room
      socket.join(`user_${userId}`);

      // Join user to their workspace rooms
      this.joinUserWorkspaceRooms(socket, userId);

      // Handle disconnection
      socket.on('disconnect', () => {
        this.connectedUsers.delete(userId);
        this.userSockets.delete(socket.id);
        logger.info(`👤 User ${userId} disconnected from Socket.IO`);
      });

      // Handle workspace events
      this.setupWorkspaceEventHandlers(socket, userId);

      // Handle notification actions
      this.setupNotificationActionHandlers(socket, userId);
    });
  }

  /**
   * Authenticate socket connection using JWT
   */
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;

      next();
    } catch (error) {
      logger.error('❌ Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Join user to their workspace rooms
   */
  async joinUserWorkspaceRooms(socket, userId) {
    try {
      const { User, WorkspaceMember } = require('../models');

      const user = await User.findByPk(userId, {
        include: [{
          model: WorkspaceMember,
          include: ['Workspace']
        }]
      });

      if (user && user.WorkspaceMembers) {
        user.WorkspaceMembers.forEach(membership => {
          socket.join(`workspace_${membership.workspace_id}`);
        });

        logger.info(`🏢 User ${userId} joined ${user.WorkspaceMembers.length} workspace rooms`);
      }
    } catch (error) {
      logger.error('❌ Failed to join workspace rooms:', error);
    }
  }

  /**
   * Setup workspace event handlers
   */
  setupWorkspaceEventHandlers(socket, userId) {
    // Handle joining workspace rooms dynamically
    socket.on('join_workspace', (workspaceId) => {
      socket.join(`workspace_${workspaceId}`);
      logger.info(`👤 User ${userId} joined workspace ${workspaceId} room`);
    });

    socket.on('leave_workspace', (workspaceId) => {
      socket.leave(`workspace_${workspaceId}`);
      logger.info(`👤 User ${userId} left workspace ${workspaceId} room`);
    });
  }

  /**
   * Setup notification action handlers
   */
  setupNotificationActionHandlers(socket, userId) {
    // Handle role request responses
    socket.on('role_request_action', async (data) => {
      try {
        const { notificationId, action, requestId } = data;
        logger.info(`📝 Role request ${action} by user ${userId}`, { requestId });

        // Process role request (approve/reject)
        await this.processRoleRequestAction(userId, action, requestId);

        // Emit response back to client
        socket.emit('role_request_processed', {
          notificationId,
          action,
          success: true
        });

      } catch (error) {
        logger.error('❌ Role request action failed:', error);
        socket.emit('role_request_processed', {
          notificationId: data.notificationId,
          action: data.action,
          success: false,
          error: error.message
        });
      }
    });

    // Handle workspace invite responses
    socket.on('workspace_invite_action', async (data) => {
      try {
        const { notificationId, action, workspaceId } = data;
        logger.info(`📨 Workspace invite ${action} by user ${userId}`, { workspaceId });

        await this.processWorkspaceInviteAction(userId, action, workspaceId);

        socket.emit('workspace_invite_processed', {
          notificationId,
          action,
          success: true
        });

        // If accepted, join workspace room and unlock menu
        if (action === 'accept' && socket.userRole === 'user') {
          socket.join(`workspace_${workspaceId}`);
          socket.emit('unlock_workspace_menu', { workspaceId });
        }

      } catch (error) {
        logger.error('❌ Workspace invite action failed:', error);
        socket.emit('workspace_invite_processed', {
          notificationId: data.notificationId,
          action: data.action,
          success: false,
          error: error.message
        });
      }
    });
  }

  notifyUser(userId, eventType, data) {
    if (!this.io) return;

    // Standardize data: If data.notification exists, flatten it
    let payload = { ...data };
    if (data.notification) {
      const notifData = typeof data.notification.toJSON === 'function'
        ? data.notification.toJSON()
        : data.notification;
      payload = { ...notifData, ...data };
      delete payload.notification;
    }

    // Ensure essential fields
    payload.type = eventType || payload.type;
    payload.created_at = payload.created_at || new Date().toISOString();
    payload.priority = payload.priority || 'normal';

    // Emit to user room (handles multiple tabs)
    this.io.to(`user_${userId}`).emit('notification', payload);

    logger.info(`📨 Notification sent to user room user_${userId}:`, eventType);
  }

  notifyWorkspace(workspaceId, eventType, data, excludeUserId = null) {
    if (!this.io) return;

    const room = `workspace_${workspaceId}`;

    // Standardize data
    let payload = { ...data };
    if (data.notification) {
      const notifData = typeof data.notification.toJSON === 'function'
        ? data.notification.toJSON()
        : data.notification;
      payload = { ...notifData, ...data };
      delete payload.notification;
    }

    payload.type = eventType || payload.type;
    payload.created_at = payload.created_at || new Date().toISOString();

    if (excludeUserId) {
      const socketId = this.connectedUsers.get(excludeUserId);
      if (socketId) {
        this.io.to(room).except(socketId).emit('notification', payload);
      } else {
        this.io.to(room).emit('notification', payload);
      }
    } else {
      this.io.to(room).emit('notification', payload);
    }

    logger.info(`🏢 Workspace notification sent to ${room}:`, eventType);
  }

  /**
   * Revoke workspace access in real-time (for system alerts)
   */
  revokeWorkspaceAccess(userId, workspaceId) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        // Remove from workspace room
        socket.leave(`workspace_${workspaceId}`);

        // Send revocation event
        socket.emit('workspace_access_revoked', {
          workspaceId,
          timestamp: new Date().toISOString(),
          message: 'Quyền truy cập workspace đã bị thu hồi'
        });

        logger.info(`🚫 Revoked workspace access for user ${userId} from workspace ${workspaceId}`);
      }
    }
  }

  /**
   * Force redirect user (for system alerts)
   */
  forceRedirect(userId, redirectUrl) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('force_redirect', {
        url: redirectUrl,
        timestamp: new Date().toISOString(),
        reason: 'System security action'
      });

      logger.info(`🔄 Force redirected user ${userId} to ${redirectUrl}`);
    }
  }

  /**
   * Process role request actions
   */
  async processRoleRequestAction(userId, action, requestId) {
    // This would integrate with your role management system
    logger.info(`Processing role request ${action} for request ${requestId} by user ${userId}`);

    // TODO: Implement actual role change logic
    // - Verify user has permission to approve/reject
    // - Update workspace member role
    // - Send confirmation notifications
  }

  /**
   * Process workspace invite actions
   */
  async processWorkspaceInviteAction(userId, action, workspaceId) {
    // This would integrate with your workspace membership system
    logger.info(`Processing workspace invite ${action} for workspace ${workspaceId} by user ${userId}`);

    // TODO: Implement actual invite processing logic
    // - Add user to workspace if accepted
    // - Remove invitation record
    // - Send confirmation notifications
  }

  /**
   * Send high priority notification with special UI treatment
   */
  sendHighPriorityNotification(userId, notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('high_priority_notification', {
        notification,
        priority: 'high',
        timestamp: new Date().toISOString(),
        special: true
      });

      logger.info(`🚨 High priority notification sent to user ${userId}`);
    }
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Broadcast system-wide notification
   */
  broadcastSystemNotification(data) {
    this.io.emit('system_notification', {
      timestamp: new Date().toISOString(),
      ...data
    });

    logger.info('📢 System-wide notification broadcast');
  }
}

module.exports = SocketService;