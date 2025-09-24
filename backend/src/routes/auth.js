const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { createDemoAccounts, getDemoAccountsInfo, resetDemoPasswords } = require('../utils/demoAccountsSeeder');

const router = express.Router();

// Initialize demo accounts on server start
let demoAccountsInitialized = false;

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'your-jwt-secret',
    { expiresIn: '7d' }
  );
};

// Initialize demo accounts if not already done
const initializeDemoAccounts = async () => {
  if (!demoAccountsInitialized) {
    console.log('🔄 Initializing demo accounts...');
    const result = await createDemoAccounts();
    if (result) {
      console.log('✅ Demo accounts initialized successfully');
    }
    demoAccountsInitialized = true;
  }
};

// @route   POST /api/auth/register
// @desc    Register new user with institutional email
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId, employeeId } = req.body;

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
      'iit.ac.in',
      'iitkgp.ac.in',
      'iitb.ac.in'
    ];
    
    const emailDomain = email.split('@')[1]?.toLowerCase();
    
    if (!emailDomain || !allowedDomains.some(domain => emailDomain.includes(domain.split('.')[0]))) {
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

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        ...(studentId ? [{ studentId }] : []),
        ...(employeeId ? [{ employeeId }] : [])
      ]
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email.toLowerCase()) {
        message = 'User already exists with this email';
      } else if (existingUser.studentId === studentId) {
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

    // Create user
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      isActive: true,
      isEmailVerified: true, // Set to true for demo, in production you'd send verification email
      profile: {
        bio: '',
        avatar: '',
        phone: '',
        address: ''
      },
      createdAt: new Date(),
      lastActive: new Date()
    };

    // Add role-specific fields
    if (role === 'student') {
      userData.studentId = studentId;
      userData.enrolledCourses = [];
    } else if (role === 'faculty') {
      userData.employeeId = employeeId;
      userData.teachingCourses = [];
    } else if (role === 'ta') {
      userData.employeeId = employeeId;
      userData.assistingCourses = [];
    } else if (role === 'admin') {
      userData.employeeId = employeeId;
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log(`✅ New user registered: ${user.email} (${user.role})`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: userResponse
      },
      message: 'Account created successfully!'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    // Ensure demo accounts exist
    await initializeDemoAccounts();

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log(`🔑 Login attempt for: ${email}`);

    // Find user
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    })
    .populate('enrolledCourses.course', 'name code semester year')
    .populate('teachingCourses', 'name code semester year')
    .populate('assistingCourses', 'name code semester year');

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log(`👤 Found user: ${user.email}, role: ${user.role}, active: ${user.isActive}`);

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`❌ Invalid password for: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login and active status
    user.lastLogin = new Date();
    user.lastActive = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    // Remove sensitive information
    const userResponse = user.toObject();
    delete userResponse.password;

    console.log(`✅ Login successful: ${user.email} (${user.role})`);

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
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', async (req, res) => {
  try {
    // This route requires auth middleware
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    
    const user = await User.findById(decoded.id)
      .populate('enrolledCourses.course', 'name code semester year faculty')
      .populate('teachingCourses', 'name code semester year enrolledStudents')
      .populate('assistingCourses', 'name code semester year faculty')
      .select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Update last active
    user.lastActive = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', async (req, res) => {
  try {
    // Update last active time if user is authenticated
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
        
        await User.findByIdAndUpdate(decoded.id, {
          lastActive: new Date()
        });
      } catch (error) {
        // Ignore token errors on logout
      }
    }

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
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(decoded.id);
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
});

// @route   GET /api/auth/demo-accounts
// @desc    Get demo accounts for testing (REMOVE IN PRODUCTION)
// @access  Public
router.get('/demo-accounts', async (req, res) => {
  try {
    // Ensure demo accounts exist
    await initializeDemoAccounts();

    const demoAccounts = getDemoAccountsInfo();

    res.status(200).json({
      success: true,
      data: demoAccounts,
      message: 'Demo accounts (remove in production)'
    });
  } catch (error) {
    console.error('Get demo accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching demo accounts'
    });
  }
});

// @route   POST /api/auth/init-demo
// @desc    Initialize demo accounts manually
// @access  Public (REMOVE IN PRODUCTION)
router.post('/init-demo', async (req, res) => {
  try {
    const result = await createDemoAccounts();
    res.status(200).json({
      success: true,
      data: result,
      message: 'Demo accounts initialized successfully'
    });
  } catch (error) {
    console.error('Init demo accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing demo accounts'
    });
  }
});

// @route   POST /api/auth/reset-demo
// @desc    Reset demo account passwords
// @access  Public (REMOVE IN PRODUCTION)
router.post('/reset-demo', async (req, res) => {
  try {
    const resetCount = await resetDemoPasswords();
    res.status(200).json({
      success: true,
      data: { resetCount },
      message: `Reset passwords for ${resetCount} demo accounts`
    });
  } catch (error) {
    console.error('Reset demo accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting demo accounts'
    });
  }
});

module.exports = router;