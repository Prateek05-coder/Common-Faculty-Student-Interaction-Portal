const jwt = require('jsonwebtoken');
const { Chat, Message } = require('../models/Chat');
const User = require('../models/User');

module.exports = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      socket.userId = user._id;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected`);
    
    // Join user to their personal room
    socket.join(socket.userId.toString());
    
    // Handle joining conversation
    socket.on('joinConversation', (conversationId) => {
      socket.join(conversationId);
    });
    
    // Handle leaving conversation
    socket.on('leaveConversation', (conversationId) => {
      socket.leave(conversationId);
    });
    
    // Handle sending message
    socket.on('sendMessage', async (data) => {
      try {
        const { conversationId, content, type = 'text' } = data;
        
        // Create message
        const message = new Message({
          conversation: conversationId,
          sender: socket.userId,
          content,
          type
        });
        
        await message.save();
        await message.populate('sender', 'name avatar role');
        
        // Update conversation's last message
        await Chat.findByIdAndUpdate(conversationId, {
          lastMessage: message._id
        });
        
        // Broadcast to conversation room
        io.to(conversationId).emit('receiveMessage', message);
        
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected`);
    });
  });
};
