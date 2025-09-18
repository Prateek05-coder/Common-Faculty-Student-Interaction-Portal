const User = require('../models/User');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const { Chat, Message } = require('../models/Chat');

// @route   GET /api/admin/stats
// @desc    Get admin system statistics
// @access  Private (Admin only)
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const totalFaculty = await User.countDocuments({ role: 'faculty', isActive: true });
    const totalTAs = await User.countDocuments({ role: 'ta', isActive: true });
    const totalCourses = await Course.countDocuments({ isActive: true });
    const totalAssignments = await Assignment.countDocuments({ isActive: true });
    const totalChats = await Chat.countDocuments({ isActive: true });
    const totalMessages = await Message.countDocuments({});

    // Growth statistics (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: true
    });
    const newCoursesThisMonth = await Course.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalStudents,
          totalFaculty,
          totalTAs,
          totalCourses,
          totalAssignments,
          totalChats,
          totalMessages
        },
        growth: {
          newUsersThisMonth,
          newCoursesThisMonth
        },
        userDistribution: {
          students: totalStudents,
          faculty: totalFaculty,
          tas: totalTAs,
          admins: totalUsers - totalStudents - totalFaculty - totalTAs
        }
      }
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin statistics'
    });
  }
};

// @route   GET /api/admin/system-health
// @desc    Get system health metrics
// @access  Private (Admin only)
const getSystemHealth = async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Convert bytes to MB
    const formatMemory = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;

    const health = {
      status: 'healthy',
      uptime: {
        seconds: uptime,
        formatted: formatUptime(uptime)
      },
      memory: {
        used: formatMemory(memoryUsage.heapUsed),
        total: formatMemory(memoryUsage.heapTotal),
        external: formatMemory(memoryUsage.external)
      },
      timestamp: new Date()
    };

    res.status(200).json({
      success: true,
      data: health
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system health'
    });
  }
};

// @route   GET /api/admin/activity
// @desc    Get recent system activity
// @access  Private (Admin only)
const getActivity = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent users
    const recentUsers = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name email role createdAt');

    // Get recent courses
    const recentCourses = await Course.find({ isActive: true })
      .populate('faculty', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name code faculty createdAt');

    // Get recent assignments
    const recentAssignments = await Assignment.find({ isActive: true })
      .populate('faculty', 'name')
      .populate('course', 'name code')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('title faculty course createdAt');

    const activities = [
      ...recentUsers.map(user => ({
        type: 'user_registered',
        entity: 'user',
        data: user,
        timestamp: user.createdAt
      })),
      ...recentCourses.map(course => ({
        type: 'course_created',
        entity: 'course',
        data: course,
        timestamp: course.createdAt
      })),
      ...recentAssignments.map(assignment => ({
        type: 'assignment_created',
        entity: 'assignment',
        data: assignment,
        timestamp: assignment.createdAt
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
     .slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: activities
    });

  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activity'
    });
  }
};

// @route   GET /api/admin/recent-users
// @desc    Get recently registered users
// @access  Private (Admin only)
const getRecentUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const users = await User.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('name email role createdAt lastActive studentId employeeId');

    res.status(200).json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get recent users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent users'
    });
  }
};

// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, sortBy = 'createdAt' } = req.query;

    let query = { isActive: true };
    
    if (role && role !== 'all') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .sort({ [sortBy]: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password -emailVerificationToken -resetPasswordToken');

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// @route   PUT /api/admin/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      data: user,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user status'
    });
  }
};

// Helper function to format uptime
const formatUptime = (uptime) => {
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  return `${hours}h ${minutes}m ${seconds}s`;
};

module.exports = {
  getStats,
  getSystemHealth,
  getActivity,
  getRecentUsers,
  getUsers,
  toggleUserStatus
};