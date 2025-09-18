const mongoose = require('mongoose');

const forumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'assignment', 'lecture', 'exam', 'technical', 'announcement'],
    default: 'general'
  },
  
  // Replies to this forum post
  replies: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInstructorReply: {
      type: Boolean,
      default: false
    }
  }],
  
  status: {
    type: String,
    enum: ['open', 'closed', 'resolved'],
    default: 'open'
  },
  
  isVisible: {
    type: Boolean,
    default: true
  },
  
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update last activity when replies are added
forumSchema.pre('save', function(next) {
  if (this.isModified('replies')) {
    this.lastActivity = new Date();
  }
  next();
});

// Method to add reply
forumSchema.methods.addReply = function(userId, userRole, content) {
  const isInstructorReply = ['faculty', 'ta', 'admin'].includes(userRole);
  
  this.replies.push({
    author: userId,
    content: content.trim(),
    createdAt: new Date(),
    isInstructorReply: isInstructorReply
  });
  
  this.lastActivity = new Date();
};

module.exports = mongoose.model('Forum', forumSchema);