const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true,
    maxlength: [100, 'Course name cannot exceed 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Course code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [10, 'Course code cannot exceed 10 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    enum: {
      values: ['Spring', 'Summer', 'Fall', 'Winter'],
      message: 'Semester must be Spring, Summer, Fall, or Winter'
    }
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2020, 'Year must be 2020 or later'],
    max: [2030, 'Year must be 2030 or earlier']
  },
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [6, 'Credits cannot exceed 6']
  },
  
  // Faculty who teaches this course
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Faculty is required']
  },
  
  // Teaching assistants for this course
  teachingAssistants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Enrolled students
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped', 'withdrawn'],
      default: 'active'
    },
    grade: {
      type: String,
      enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'I', 'W'],
      default: null
    }
  }],
  
  // Course schedule for calendar
  schedule: [{
    type: {
      type: String,
      enum: ['lecture', 'meeting', 'exam', 'assignment', 'urgent', 'lab', 'tutorial'],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String,
      default: ''
    },
    endTime: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Course materials (PPTs, notes, documents)
  materials: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    category: {
      type: String,
      enum: ['lecture', 'assignment', 'reference', 'notes', 'slides', 'other'],
      default: 'other'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    downloadCount: {
      type: Number,
      default: 0
    }
  }],
  
  // Video lectures
  videoLectures: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    fileName: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    fileUrl: {
      type: String,
      required: true
    },
    thumbnailUrl: {
      type: String,
      default: ''
    },
    duration: {
      type: Number,
      default: 0
    },
    subtitlesUrl: {
      type: String,
      default: ''
    },
    quality: {
      type: String,
      enum: ['720p', '1080p', '480p'],
      default: '720p'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    viewCount: {
      type: Number,
      default: 0
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // Course announcements
  announcements: [{
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
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    isVisible: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    }
  }],
  
  // Course settings
  maxStudents: {
    type: Number,
    default: 50,
    min: [1, 'Max students must be at least 1'],
    max: [500, 'Max students cannot exceed 500']
  },
  
  // Status flags
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  
  // Course metadata
  tags: [{
    type: String,
    trim: true
  }],
  
  // Statistics
  stats: {
    totalAssignments: {
      type: Number,
      default: 0
    },
    totalMaterials: {
      type: Number,
      default: 0
    },
    totalVideos: {
      type: Number,
      default: 0
    },
    totalEnrollments: {
      type: Number,
      default: 0
    },
    averageGrade: {
      type: Number,
      default: null
    },
    completionRate: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
courseSchema.index({ faculty: 1 });
courseSchema.index({ code: 1 }, { unique: true });
courseSchema.index({ semester: 1, year: 1 });
courseSchema.index({ 'enrolledStudents.student': 1 });
courseSchema.index({ teachingAssistants: 1 });
courseSchema.index({ isActive: 1, isPublished: 1 });

// Virtual for enrolled student count
courseSchema.virtual('enrollmentCount').get(function() {
  return this.enrolledStudents.filter(student => student.status === 'active').length;
});

// Virtual for full course identifier
courseSchema.virtual('fullCode').get(function() {
  return `${this.code} - ${this.name}`;
});

// Pre-save middleware to update stats
courseSchema.pre('save', function(next) {
  // Update material count
  this.stats.totalMaterials = this.materials.filter(m => m.isVisible).length;
  
  // Update video count
  this.stats.totalVideos = this.videoLectures.filter(v => v.isVisible).length;
  
  // Update enrollment count
  this.stats.totalEnrollments = this.enrolledStudents.filter(s => s.status === 'active').length;
  
  next();
});

// Instance method to check if user can access course
courseSchema.methods.canUserAccess = function(userId, userRole) {
  const userIdStr = userId.toString();
  
  // Admin can access all courses
  if (userRole === 'admin') return true;
  
  // Faculty can access their own courses
  if (userRole === 'faculty' && this.faculty.toString() === userIdStr) return true;
  
  // TA can access assigned courses
  if (userRole === 'ta' && this.teachingAssistants.some(ta => ta.toString() === userIdStr)) return true;
  
  // Students can access enrolled courses
  if (userRole === 'student') {
    return this.enrolledStudents.some(enrollment => 
      enrollment.student.toString() === userIdStr && enrollment.status === 'active'
    );
  }
  
  return false;
};

// Instance method to get user's role in course
courseSchema.methods.getUserRole = function(userId) {
  const userIdStr = userId.toString();
  
  if (this.faculty.toString() === userIdStr) return 'instructor';
  if (this.teachingAssistants.some(ta => ta.toString() === userIdStr)) return 'ta';
  if (this.enrolledStudents.some(e => e.student.toString() === userIdStr)) return 'student';
  
  return null;
};

// Instance method to add material
courseSchema.methods.addMaterial = function(materialData) {
  this.materials.push(materialData);
  return this.materials[this.materials.length - 1];
};

// Instance method to add video lecture
courseSchema.methods.addVideoLecture = function(videoData) {
  this.videoLectures.push(videoData);
  return this.videoLectures[this.videoLectures.length - 1];
};

// Instance method to add schedule item
courseSchema.methods.addScheduleItem = function(scheduleData) {
  this.schedule.push(scheduleData);
  return this.schedule[this.schedule.length - 1];
};

// Static method to find courses by faculty
courseSchema.statics.findByFaculty = function(facultyId, options = {}) {
  let query = { faculty: facultyId, isActive: true };
  
  if (options.published !== undefined) {
    query.isPublished = options.published;
  }
  
  return this.find(query)
    .populate('teachingAssistants', 'name email')
    .populate('enrolledStudents.student', 'name email studentId')
    .sort({ createdAt: -1 });
};

// Static method to find courses by student
courseSchema.statics.findByStudent = function(studentId, options = {}) {
  let query = {
    'enrolledStudents.student': studentId,
    'enrolledStudents.status': 'active',
    isActive: true
  };
  
  if (options.published !== undefined) {
    query.isPublished = options.published;
  }
  
  return this.find(query)
    .populate('faculty', 'name email')
    .populate('teachingAssistants', 'name email')
    .sort({ createdAt: -1 });
};

// Static method to find courses by TA
courseSchema.statics.findByTA = function(taId, options = {}) {
  let query = {
    teachingAssistants: taId,
    isActive: true
  };
  
  if (options.published !== undefined) {
    query.isPublished = options.published;
  }
  
  return this.find(query)
    .populate('faculty', 'name email')
    .populate('enrolledStudents.student', 'name email studentId')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Course', courseSchema);