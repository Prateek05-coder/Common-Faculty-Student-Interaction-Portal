const Forum = require('../models/Forum');
const Course = require('../models/Course');
const User = require('../models/User');

// @route   POST /api/forums
// @desc    Create new forum post
// @access  Private
const createForumPost = async (req, res) => {
  try {
    console.log('Create forum post request:', req.body);
    console.log('User role:', req.user.role);
    
    const user = req.user;
    const { title, content, course, category } = req.body;

    // Validate required fields
    if (!title || !content || !course) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and course are required'
      });
    }

    // Verify course exists and user has access
    const courseObj = await Course.findById(course);
    if (!courseObj) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user can access this course
    const canAccess = courseObj.faculty?.toString() === user._id.toString() || 
                     courseObj.teachingAssistants?.includes(user._id) ||
                     courseObj.enrolledStudents?.some(e => e.student.toString() === user._id.toString()) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this course'
      });
    }

    // Create forum post
    const forumData = {
      title: title.trim(),
      content: content.trim(),
      course: course,
      author: user._id,
      category: category || 'general',
      replies: [],
      status: 'open',
      isVisible: true,
      lastActivity: new Date()
    };

    console.log('Creating forum post with data:', forumData);

    const forumPost = new Forum(forumData);
    const savedPost = await forumPost.save();

    console.log('Forum post saved successfully:', savedPost._id);

    // Populate the created post
    const populatedPost = await Forum.findById(savedPost._id)
      .populate('author', 'name email role')
      .populate('course', 'name code');

    console.log('✅ Forum post created successfully:', populatedPost.title);

    res.status(201).json({
      success: true,
      data: populatedPost,
      message: 'Forum post created successfully'
    });

  } catch (error) {
    console.error('Create forum post error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating forum post: ' + error.message
    });
  }
};

// @route   GET /api/forums
// @desc    Get forum posts based on user role and course
// @access  Private
const getForumPosts = async (req, res) => {
  try {
    const user = req.user;
    const { course, category, status } = req.query;
    
    let query = { isVisible: true };
    
    // Course filter
    if (course) {
      query.course = course;
    } else {
      // Get courses user has access to
      let accessibleCourses = [];
      
      switch (user.role) {
        case 'faculty':
          accessibleCourses = await Course.find({ faculty: user._id, isActive: true });
          break;
        case 'ta':
          accessibleCourses = await Course.find({ teachingAssistants: user._id, isActive: true });
          break;
        case 'student':
          accessibleCourses = await Course.find({ 
            'enrolledStudents.student': user._id,
            'enrolledStudents.status': 'active',
            isActive: true 
          });
          break;
        case 'admin':
          accessibleCourses = await Course.find({ isActive: true });
          break;
      }
      
      query.course = { $in: accessibleCourses.map(c => c._id) };
    }
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }

    const forumPosts = await Forum.find(query)
      .populate('author', 'name email role')
      .populate('course', 'name code')
      .populate('replies.author', 'name email role')
      .sort({ lastActivity: -1 });

    res.status(200).json({
      success: true,
      data: forumPosts,
      count: forumPosts.length
    });

  } catch (error) {
    console.error('Get forum posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching forum posts'
    });
  }
};

// @route   GET /api/forums/:id
// @desc    Get forum post by ID with replies
// @access  Private
const getForumPostById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const forumPost = await Forum.findById(id)
      .populate('author', 'name email role')
      .populate('course', 'name code')
      .populate('replies.author', 'name email role');

    if (!forumPost) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    // Check if user can access this course
    const course = await Course.findById(forumPost.course._id);
    const canAccess = course.faculty?.toString() === user._id.toString() || 
                     course.teachingAssistants?.includes(user._id) ||
                     course.enrolledStudents?.some(e => e.student.toString() === user._id.toString()) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this forum post'
      });
    }

    res.status(200).json({
      success: true,
      data: forumPost
    });

  } catch (error) {
    console.error('Get forum post by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching forum post'
    });
  }
};

// @route   POST /api/forums/:id/reply
// @desc    Add reply to forum post
// @access  Private
const addReplyToPost = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const forumPost = await Forum.findById(id).populate('course');
    if (!forumPost) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    // Check if user can access this course
    const course = forumPost.course;
    const canAccess = course.faculty?.toString() === user._id.toString() || 
                     course.teachingAssistants?.includes(user._id) ||
                     course.enrolledStudents?.some(e => e.student.toString() === user._id.toString()) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this course'
      });
    }

    // Add reply using schema method
    forumPost.addReply(user._id, user.role, content);
    await forumPost.save();

    // Get the updated post with populated replies
    const updatedPost = await Forum.findById(forumPost._id)
      .populate('author', 'name email role')
      .populate('course', 'name code')
      .populate('replies.author', 'name email role');

    console.log(`✅ Reply added to forum post: ${forumPost.title} by ${user.email}`);

    res.status(201).json({
      success: true,
      data: updatedPost,
      message: 'Reply added successfully'
    });

  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reply'
    });
  }
};

// @route   GET /api/forums/course/:courseId
// @desc    Get forum posts for specific course
// @access  Private
const getForumPostsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = req.user;

    // Verify course exists and user has access
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    const canAccess = course.faculty?.toString() === user._id.toString() || 
                     course.teachingAssistants?.includes(user._id) ||
                     course.enrolledStudents?.some(e => e.student.toString() === user._id.toString()) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this course'
      });
    }

    const forumPosts = await Forum.find({ 
      course: courseId, 
      isVisible: true 
    })
    .populate('author', 'name email role')
    .populate('course', 'name code')
    .populate('replies.author', 'name email role')
    .sort({ lastActivity: -1 });

    res.status(200).json({
      success: true,
      data: forumPosts,
      count: forumPosts.length
    });

  } catch (error) {
    console.error('Get forum posts by course error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course forum posts'
    });
  }
};

// @route   PUT /api/forums/:id/status
// @desc    Update forum post status (Faculty, TA, Admin only)
// @access  Private
const updateForumStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { status } = req.body;

    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can update forum status'
      });
    }

    if (!['open', 'closed', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: open, closed, or resolved'
      });
    }

    const forumPost = await Forum.findById(id).populate('course');
    if (!forumPost) {
      return res.status(404).json({
        success: false,
        message: 'Forum post not found'
      });
    }

    // Check if user can modify this course's forums
    const course = forumPost.course;
    const canAccess = course.faculty?.toString() === user._id.toString() || 
                     course.teachingAssistants?.includes(user._id) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    forumPost.status = status;
    await forumPost.save();

    console.log(`✅ Forum status updated: ${forumPost.title} -> ${status}`);

    res.status(200).json({
      success: true,
      message: 'Forum status updated successfully'
    });

  } catch (error) {
    console.error('Update forum status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating forum status'
    });
  }
};

module.exports = {
  createForumPost,
  getForumPosts,
  getForumPostById,
  addReplyToPost,
  getForumPostsByCourse,
  updateForumStatus
};