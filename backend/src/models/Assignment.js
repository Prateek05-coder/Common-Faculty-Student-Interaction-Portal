const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maxPoints: {
    type: Number,
    required: true,
    min: 1
  },
  dueDate: {
    type: Date,
    required: true
  },
  availableFrom: {
    type: Date,
    default: Date.now
  },
  instructions: {
    type: String,
    default: ''
  },
  allowedFileTypes: [{
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'ppt', 'pptx']
  }],
  maxFileSize: {
    type: Number,
    default: 10485760 // 10MB
  },
  submissionType: {
    type: String,
    enum: ['text', 'file', 'both'],
    default: 'both'
  },
  
  // Student submissions
  submissions: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    files: [{
      fileName: String,
      originalName: String,
      fileUrl: String,
      fileSize: Number
    }],
    textSubmission: String,
    
    // Grading
    grade: {
      type: Number,
      min: 0
    },
    feedback: String,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    gradedAt: Date,
    isGraded: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['submitted', 'late', 'graded', 'returned'],
      default: 'submitted'
    }
  }],
  
  isPublished: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better performance
assignmentSchema.index({ course: 1, dueDate: 1 });
assignmentSchema.index({ instructor: 1 });
assignmentSchema.index({ 'submissions.student': 1 });

// Method to check if student can submit
assignmentSchema.methods.canStudentSubmit = function(studentId) {
  if (!this.isPublished || !this.isActive) return false;
  if (new Date() < this.availableFrom) return false;
  
  const submission = this.submissions.find(sub => sub.student.toString() === studentId.toString());
  return !submission; // Allow one submission for now
};

// Method to get student submission
assignmentSchema.methods.getStudentSubmission = function(studentId) {
  return this.submissions.find(sub => sub.student.toString() === studentId.toString());
};

module.exports = mongoose.model('Assignment', assignmentSchema);