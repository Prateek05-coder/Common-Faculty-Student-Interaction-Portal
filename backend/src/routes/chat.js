const express = require('express');
const { Chat, Message } = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// All chat routes require authentication
router.use(auth);

// @route   GET /api/chat/conversations
// @desc    Get user's conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Chat.find({
      participants: userId,
      isActive: true
    })
    .populate('participants', 'name email role avatar lastActive')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          'isRead.user': { $ne: userId },
          sender: { $ne: userId }
        });

        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: conversationsWithUnread
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations'
    });
  }
};

// @route   POST /api/chat/conversations
// @desc    Create new conversation
// @access  Private
const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user._id;

    // Check if conversation already exists
    const existingConversation = await Chat.findOne({
      participants: { $all: [userId, participantId] },
      type: 'direct'
    }).populate('participants', 'name email role avatar');

    if (existingConversation) {
      return res.status(200).json({
        success: true,
        data: existingConversation
      });
    }

    // Validate participant exists and role permissions
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check role-based chat permissions
    const canChat = checkChatPermissions(req.user.role, participant.role);
    if (!canChat) {
      return res.status(403).json({
        success: false,
        message: 'Cannot start conversation with this user'
      });
    }

    // Create new conversation
    const conversation = new Chat({
      participants: [userId, participantId],
      type: 'direct'
    });

    await conversation.save();
    await conversation.populate('participants', 'name email role avatar');

    res.status(201).json({
      success: true,
      data: conversation
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating conversation'
    });
  }
};

// @route   GET /api/chat/conversations/:id/messages
// @desc    Get messages from a conversation
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Check if user has access to this conversation
    const conversation = await Chat.findOne({
      _id: id,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    const messages = await Message.find({ conversation: id })
      .populate('sender', 'name email role avatar')
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      {
        conversation: id,
        sender: { $ne: userId },
        'isRead.user': { $ne: userId }
      },
      {
        $push: {
          isRead: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.status(200).json({
      success: true,
      data: messages
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages'
    });
  }
};

// @route   POST /api/chat/messages
// @desc    Send a message
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type = 'text' } = req.body;
    const userId = req.user._id;

    // Verify conversation access
    const conversation = await Chat.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: userId,
      content: content.trim(),
      type
    });

    await message.save();
    await message.populate('sender', 'name email role avatar');

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.updatedAt = new Date();
    await conversation.save();

    res.status(201).json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message'
    });
  }
};

// Helper function to check chat permissions
const checkChatPermissions = (userRole, targetRole) => {
  const permissions = {
    student: ['faculty', 'ta', 'admin'],
    faculty: ['student', 'ta', 'admin'],
    ta: ['student', 'faculty', 'admin'],
    admin: ['student', 'faculty', 'ta']
  };

  return permissions[userRole]?.includes(targetRole) || false;
};

// Routes
router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id/messages', getMessages);
router.post('/messages', sendMessage);

module.exports = router;
