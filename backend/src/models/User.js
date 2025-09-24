const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  role: {
    type: String,
    enum: ['student', 'faculty', 'ta', 'admin'],
    required: true
  },
  
  // Role-specific fields
  studentId: {
    type: String,
    sparse: true, // Allows null but unique when present
    unique: true
  },
  employeeId: {
    type: String,
    sparse: true,
    unique: true
  },
  
  // Profile information
  profile: {
    bio: {
      type: String,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    address: {
      type: String,
      default: ''
    }
  },
  
  // Course relationships
  enrolledCourses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'dropped'],
      default: 'active'
    }
  }],
  
  teachingCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  assistingCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerifiedAt: Date,
  
  // Password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  passwordChangedAt: Date,
  
  // Activity tracking
  lastLogin: Date,
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // Institution info
  institutionCode: String,
  
  // Preferences
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      },
      assignments: {
        type: Boolean,
        default: true
      },
      messages: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ studentId: 1 }, { sparse: true });
userSchema.index({ employeeId: 1 }, { sparse: true });
userSchema.index({ isActive: 1 });
userSchema.index({ lastActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Method to get user's display name
userSchema.methods.getDisplayName = function() {
  return this.name;
};

// Method to get user's role display
userSchema.methods.getRoleDisplay = function() {
  const roleMap = {
    student: 'Student',
    faculty: 'Faculty',
    ta: 'Teaching Assistant',
    admin: 'Administrator'
  };
  return roleMap[this.role] || this.role;
};

// Method to check if user can access course
userSchema.methods.canAccessCourse = function(courseId) {
  const courseIdStr = courseId.toString();
  
  if (this.role === 'admin') return true;
  
  if (this.role === 'student') {
    return (this.enrolledCourses || []).some(ec => ec.course.toString() === courseIdStr);
  }
  
  if (this.role === 'faculty') {
    return (this.teachingCourses || []).some(tc => tc.toString() === courseIdStr);
  }
  
  if (this.role === 'ta') {
    return (this.assistingCourses || []).some(ac => ac.toString() === courseIdStr);
  }
  
  return false;
};

// Method to get accessible courses
userSchema.methods.getAccessibleCourses = function() {
  if (this.role === 'student') {
    return (this.enrolledCourses || []).map(ec => ec.course);
  } else if (this.role === 'faculty') {
    return this.teachingCourses || [];
  } else if (this.role === 'ta') {
    return this.assistingCourses || [];
  }
  return [];
};

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Update the lastActive field when user is saved
  if (this.isModified() && !this.isModified('lastActive')) {
    this.lastActive = new Date();
  }
  next();
});

// Transform output (remove sensitive fields)
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.emailVerificationToken;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  return userObject;
};

module.exports = mongoose.model('User', userSchema);