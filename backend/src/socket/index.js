const jwt = require('jsonwebtoken');
const User = require('../models/User');

const activeUsers = new Map();

const setupSocketHandlers = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || !user.isActive) {
        return next(new Error('Invalid or inactive user'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 User ${user.name} connected (${user.role})`);

    // Store user connection
    activeUsers.set(user._id.toString(), {
      user: user,
      socketId: socket.id,
      lastSeen: new Date(),
      status: 'online'
    });

    // Join user to personal room
    socket.join(`user_${user._id}`);

    // Handle chat events
    socket.on('send_message', async (data) => {
      try {
        const { recipientId, message, messageType = 'text' } = data;

        const messageData = {
          sender: {
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
            role: user.role
          },
          content: message,
          messageType,
          timestamp: new Date()
        };

        // Send to recipient
        io.to(`user_${recipientId}`).emit('new_message', messageData);
        socket.emit('message_sent', messageData);

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { recipientId } = data;
      io.to(`user_${recipientId}`).emit('user_typing', {
        userId: user._id,
        userName: user.name,
        isTyping: true
      });
    });

    socket.on('typing_stop', (data) => {
      const { recipientId } = data;
      io.to(`user_${recipientId}`).emit('user_typing', {
        userId: user._id,
        userName: user.name,
        isTyping: false
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User ${user.name} disconnected`);
      activeUsers.delete(user._id.toString());
    });
  });
};

module.exports = setupSocketHandlers;