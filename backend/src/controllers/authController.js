const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register new user with institutional email validation
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role, studentId, employeeId, institutionCode } = req.body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required'
      });
    }

    // Validate institutional email domains
    const allowedDomains = [
      'university.edu',
      'college.edu', 
      'school.edu',
      'edu.in',
      'ac.in',
      'iitg.ac.in',
      'iitkgp.ac.in',
      'iitb.ac.in',
      'iitd.ac.in',
      'iitm.ac.in',
      'iisc.ac.in'
    ];
    
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (!emailDomain || !allowedDomains.some(domain => emailDomain.endsWith(domain))) {
      return res.status(400).json({
        success: false,
        message: 'Please use your institutional email address (.edu, .edu.in, .ac.in domains)'
      });
    }

    // Validate role-specific requirements
    if (role === 'student' && !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required for student accounts'
      });
    }

    if (['faculty', 'ta', 'admin'].includes(role) && !employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required for faculty, TA, and admin accounts'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { studentId: studentId },
        { employeeId: employeeId }
      ]
    });

    if (existingUser) {
      let message = 'User already exists with this email';
      if (existingUser.studentId === studentId) {
        message = 'User already exists with this Student ID';
      } else if (existingUser.employeeId === employeeId) {
        message = 'User already exists with this Employee ID';
      }
      
      return res.status(400).json({
        success: false,
        message
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      institutionCode: institutionCode || emailDomain,
      emailVerificationToken,
      isEmailVerified: false,
      isActive: true,
      enrolledCourses: role === 'student' ? [] : undefined,
      teachingCourses: role === 'faculty' ? [] : undefined,
      assistingCourses: role === 'ta' ? [] : undefined,
      profile: {
        bio: '',
        avatar: '',
        phone: '',
        address: ''
      }
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.studentId = studentId;
    } else if (['faculty', 'ta', 'admin'].includes(role)) {
      userData.employeeId = employeeId;
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Send email verification (placeholder - integrate with email service)
    // await sendVerificationEmail(user.email, emailVerificationToken);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.emailVerificationToken;

    res.status(201).json({
      success: true,
      data: {
        token,
        user: userResponse
      },
      message: 'Account created successfully! Please verify your email address.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @route   POST /api/auth/login
// @desc    Login user with institutional email
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user and populate course references
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    })
    .populate('enrolledCourses.course', 'name code semester year')
    .populate('teachingCourses', 'name code semester year')
    .populate('assistingCourses', 'name code semester year');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is verified (optional - can be enabled later)
    // if (!user.isEmailVerified) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Please verify your email address before logging in'
    //   });
    // }

    // Update last login and active status
    user.lastLogin = new Date();
    user.lastActive = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Remove sensitive information
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.emailVerificationToken;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.status(200).json({
      success: true,
      data: {
        token,
        user: userResponse
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('enrolledCourses.course', 'name code semester year faculty')
      .populate('teachingCourses', 'name code semester year enrolledStudents')
      .populate('assistingCourses', 'name code semester year faculty')
      .select('-password -emailVerificationToken -resetPasswordToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, bio, address } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update basic info
    if (name) user.name = name.trim();
    if (phone !== undefined) user.profile.phone = phone.trim();
    if (bio !== undefined) user.profile.bio = bio.trim();
    if (address !== undefined) user.profile.address = address.trim();

    user.updatedAt = new Date();
    await user.save();

    // Remove sensitive fields
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.emailVerificationToken;

    res.status(200).json({
      success: true,
      data: userResponse,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All password fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });

    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedResetToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Send reset email (placeholder - integrate with email service)
    // await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, you will receive a password reset link'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset request'
    });
  }
};

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password and confirm password are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Hash the token and find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

// @route   POST /api/auth/verify-email/:token
// @desc    Verify user email
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerifiedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  }
};

// @route   POST /api/auth/logout
// @desc    Logout user (optional - mainly for logging)
// @access  Private
const logout = async (req, res) => {
  try {
    // Update last active time
    await User.findByIdAndUpdate(req.user.id, {
      lastActive: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  logout
};