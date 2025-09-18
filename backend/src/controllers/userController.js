const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @route   PUT /api/users/profile
// @desc    Update current user's own profile (ALL ROLES)
// @access  Private
const updateMyProfile = async (req, res) => {
  try {
    console.log('Profile update request for user:', req.user.email);
    console.log('Request body:', req.body);
    
    const currentUser = req.user;
    const { name, phone, bio, address } = req.body;

    // Get current user from database
    const user = await User.findById(currentUser._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile fields - allow all roles to update their own profile
    let updated = false;

    if (name && name.trim() && name.trim() !== user.name) {
      user.name = name.trim();
      updated = true;
      console.log('Updated name:', user.name);
    }
    
    if (phone !== undefined && phone.trim() !== user.profile?.phone) {
      if (!user.profile) {
        user.profile = {};
      }
      user.profile.phone = phone.trim();
      updated = true;
      console.log('Updated phone:', user.profile.phone);
    }
    
    if (bio !== undefined && bio.trim() !== user.profile?.bio) {
      if (!user.profile) {
        user.profile = {};
      }
      user.profile.bio = bio.trim();
      updated = true;
      console.log('Updated bio:', user.profile.bio);
    }
    
    if (address !== undefined && address.trim() !== user.profile?.address) {
      if (!user.profile) {
        user.profile = {};
      }
      user.profile.address = address.trim();
      updated = true;
      console.log('Updated address:', user.profile.address);
    }

    if (!updated) {
      return res.status(200).json({
        success: true,
        data: user,
        message: 'No changes to update'
      });
    }

    // Update timestamp
    user.updatedAt = new Date();
    
    // Save user
    await user.save();
    console.log('Profile saved successfully for:', user.email);

    // Return updated user without sensitive data
    const updatedUser = await User.findById(user._id)
      .select('-password -emailVerificationToken -resetPasswordToken');

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update my profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile: ' + error.message
    });
  }
};

// @route   POST /api/users/change-password
// @desc    Change user password (ALL ROLES)
// @access  Private
const changePassword = async (req, res) => {
  try {
    console.log('Password change request for user:', req.user.email);
    
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are required'
      });
    }

    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New passwords do not match'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
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
    user.updatedAt = new Date();
    
    await user.save();

    console.log('✅ Password changed successfully for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password: ' + error.message
    });
  }
};

// @route   GET /api/users/profile
// @desc    Get current user's profile
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('enrolledCourses.course', 'name code')
      .populate('teachingCourses', 'name code')
      .populate('assistingCourses', 'name code')
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

// @route   GET /api/users/dashboard-stats
// @desc    Get dashboard statistics for current user
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    const Course = require('../models/Course');
    const Assignment = require('../models/Assignment');
    const Forum = require('../models/Forum');

    let stats = {};

    switch (user.role) {
      case 'faculty':
        const facultyCourses = await Course.find({ faculty: user._id, isActive: true });
        const facultyAssignments = await Assignment.find({ 
          course: { $in: facultyCourses.map(c => c._id) },
          isActive: true 
        });
        
        // Count ungraded submissions
        let pendingGrading = 0;
        for (const assignment of facultyAssignments) {
          pendingGrading += assignment.submissions.filter(s => !s.isGraded).length;
        }

        stats = {
          totalCourses: facultyCourses.length,
          totalStudents: facultyCourses.reduce((sum, course) => sum + course.enrolledStudents.length, 0),
          totalAssignments: facultyAssignments.length,
          pendingGrading: pendingGrading
        };
        break;
        
      case 'ta':
        const taCourses = await Course.find({ teachingAssistants: user._id, isActive: true });
        const taAssignments = await Assignment.find({ 
          course: { $in: taCourses.map(c => c._id) },
          isActive: true 
        });
        
        let taPendingGrading = 0;
        for (const assignment of taAssignments) {
          taPendingGrading += assignment.submissions.filter(s => !s.isGraded).length;
        }

        stats = {
          totalCourses: taCourses.length,
          totalStudents: taCourses.reduce((sum, course) => sum + course.enrolledStudents.length, 0),
          totalAssignments: taAssignments.length,
          pendingGrading: taPendingGrading
        };
        break;
        
      case 'student':
        const studentCourses = await Course.find({ 
          'enrolledStudents.student': user._id,
          'enrolledStudents.status': 'active',
          isActive: true 
        });
        
        const studentAssignments = await Assignment.find({ 
          course: { $in: studentCourses.map(c => c._id) },
          isPublished: true,
          isActive: true 
        });
        
        const submittedCount = studentAssignments.filter(assignment => 
          assignment.getStudentSubmission(user._id)
        ).length;
        
        const gradedCount = studentAssignments.filter(assignment => {
          const submission = assignment.getStudentSubmission(user._id);
          return submission && submission.isGraded;
        }).length;

        stats = {
          totalCourses: studentCourses.length,
          totalAssignments: studentAssignments.length,
          submittedAssignments: submittedCount,
          gradedAssignments: gradedCount
        };
        break;
        
      case 'admin':
        const allCourses = await Course.find({ isActive: true });
        const allUsers = await User.find({ isActive: true });
        const allAssignments = await Assignment.find({ isActive: true });

        stats = {
          totalCourses: allCourses.length,
          totalUsers: allUsers.length,
          totalFaculty: allUsers.filter(u => u.role === 'faculty').length,
          totalStudents: allUsers.filter(u => u.role === 'student').length,
          totalAssignments: allAssignments.length
        };
        break;
    }

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

// @route   GET /api/users/search
// @desc    Search users by name, email, role
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { query, role } = req.query;
    const currentUser = req.user;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    let searchCriteria = {
      _id: { $ne: currentUser._id }, // Exclude current user
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    };

    if (role && role !== 'all') {
      searchCriteria.role = role;
    }

    const users = await User.find(searchCriteria)
      .select('name email role profile.avatar lastActive')
      .limit(20)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users'
    });
  }
};

module.exports = {
  updateMyProfile,
  changePassword,
  getMyProfile,
  getDashboardStats,
  searchUsers
};