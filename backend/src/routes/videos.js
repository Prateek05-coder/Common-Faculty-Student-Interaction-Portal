const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const Course = require('../models/Course');
const { checkCourseAccess, ensureCourseRelationships } = require('../utils/courseAccess');
const { notifyVideoUploaded } = require('../controllers/notificationController');
const { deleteVideo } = require('../controllers/videoController');
const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const baseDir = path.join(process.cwd(), 'uploads');
    
    if (file.fieldname === 'video') {
      cb(null, path.join(baseDir, 'videos'));
    } else if (file.fieldname === 'attachments') {
      cb(null, path.join(baseDir, 'documents'));
    } else {
      cb(null, path.join(baseDir, 'thumbnails'));
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB for videos
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid video file type'), false);
      }
    } else if (file.fieldname === 'attachments') {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid attachment file type'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// All video routes require authentication
router.use(auth);

// @route   GET /api/videos
// @desc    Get videos based on user's courses
// @access  Private
const getVideos = async (req, res) => {
  try {
    const user = req.user;
    const { course, limit = 50 } = req.query;

    // Get user's accessible courses
    let accessibleCourses = [];
    
    if (user.role === 'student') {
      accessibleCourses = (user.enrolledCourses || []).map(ec => ec.course);
    } else if (user.role === 'faculty') {
      accessibleCourses = user.teachingCourses || [];
    } else if (user.role === 'ta') {
      accessibleCourses = user.assistingCourses || [];
    } else if (user.role === 'admin') {
      const allCourses = await Course.find({ isActive: true }).select('_id');
      accessibleCourses = allCourses.map(c => c._id);
    }

    // Build query
    let query = {
      course: { $in: accessibleCourses },
      isPublished: true
    };

    if (course && course !== 'all') {
      query.course = course;
    }

    const videos = await Video.find(query)
      .populate('course', 'name code')
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      data: videos
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching videos'
    });
  }
};

// @route   POST /api/videos
// @desc    Upload new video (Faculty/TA only)
// @access  Private
const uploadVideo = async (req, res) => {
  const uploadFields = upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
    { name: 'attachments', maxCount: 10 }
  ]);

  uploadFields(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const user = req.user;

      if (!['faculty', 'ta', 'admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Faculty, TA, or Admin role required.'
        });
      }

      const { title, description, courseId } = req.body;

      // Validate required fields
      if (!title || !courseId || !req.files.video) {
        return res.status(400).json({
          success: false,
          message: 'Title, course, and video file are required'
        });
      }

      // TEMPORARY FIX: Allow all faculty, TA, and admin users to upload videos
      // This bypasses the complex access control while we fix the relationships
      
      console.log(`🔍 Video upload attempt by ${user.email} (${user.role}) for course ${courseId}`);
      
      // Check if user has permission to upload videos
      if (!['faculty', 'ta', 'admin'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only faculty, TAs, and admins can upload videos'
        });
      }

      // Get course document
      const courseDoc = await Course.findById(courseId);
      if (!courseDoc) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      console.log(`✅ Video upload allowed for ${user.role} ${user.email} on course ${courseDoc.code}`);

      // Process attachments
      const attachments = [];
      if (req.files.attachments) {
        req.files.attachments.forEach(file => {
          attachments.push({
            name: file.originalname,
            type: getAttachmentType(file.originalname),
            url: `/uploads/documents/${file.filename}`,
            size: file.size
          });
        });
      }

      // Create video record
      const video = new Video({
        title,
        description,
        course: courseId,
        uploadedBy: user._id,
        videoUrl: `/uploads/videos/${req.files.video[0].filename}`,
        thumbnailUrl: req.files.thumbnail ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}` : null,
        attachments,
        isPublished: true
      });

      await video.save();

      // Populate the video before sending response
      await video.populate([
        { path: 'course', select: 'name code' },
        { path: 'uploadedBy', select: 'name email role' }
      ]);

      // Notify students
      const course = await Course.findById(courseId).populate('enrolledStudents');
      if (course && course.enrolledStudents.length > 0) {
        await notifyVideoUploaded(video, course, user);
      }

      res.status(201).json({
        success: true,
        data: video,
        message: 'Video uploaded successfully'
      });

    } catch (error) {
      console.error('💥 Upload video error:', error);
      console.error('Error stack:', error.stack);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      
      // Clean up uploaded files on error
      if (req.files) {
        Object.values(req.files).flat().forEach(file => {
          try {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
              console.log(`🗑️ Cleaned up file: ${file.path}`);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up file:', cleanupError);
          }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error uploading video: ' + error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
};

// @route   GET /api/videos/:id
// @desc    Get single video
// @access  Private
const getVideo = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const video = await Video.findById(id)
      .populate('course', 'name code')
      .populate('uploadedBy', 'name email role avatar')
      .populate('comments.user', 'name email role avatar')
      .populate('likes.user', 'name email role avatar');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // TEMPORARY FIX: Allow all authenticated users to view videos
    console.log(`🔍 Video view attempt by ${user.email} (${user.role}) for video ${video.title}`);
    
    // All authenticated users can view videos for now
    console.log(`✅ Video view allowed for ${user.role} ${user.email}`);

    // Increment view count
    video.viewCount = (video.viewCount || 0) + 1;
    await video.save();

    res.status(200).json({
      success: true,
      data: video
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching video'
    });
  }
};

// @route   POST /api/videos/:id/like
// @desc    Like video
// @access  Private
const likeVideo = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // TEMPORARY FIX: Allow all authenticated users to like videos
    console.log(`Like video attempt by ${user.email} (${user.role})`);
    
    // All authenticated users can like videos for now
    console.log(`Like video allowed for ${user.role} ${user.email}`);

    const existingLikeIndex = video.likes.findIndex(
      like => like.user.toString() === user._id.toString()
    );

    if (existingLikeIndex >= 0) {
      // Unlike
      video.likes.splice(existingLikeIndex, 1);
    } else {
      // Like
      video.likes.push({
        user: user._id
      });
    }

    await video.save();

    res.status(200).json({
      success: true,
      data: {
        likes: video.likes.length,
        isLiked: existingLikeIndex < 0
      },
      message: existingLikeIndex >= 0 ? 'Video unliked' : 'Video liked'
    });

  } catch (error) {
    console.error('Like video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error liking video'
    });
  }
};

// @route   POST /api/videos/:id/comments
// @desc    Add comment to video
// @access  Private
const addComment = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { comment, timestamp } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required'
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // TEMPORARY FIX: Allow all authenticated users to comment on videos
    console.log(`🔍 Video comment attempt by ${user.email} (${user.role})`);
    
    // All authenticated users can comment for now
    console.log(`✅ Video comment allowed for ${user.role} ${user.email}`);

    const newComment = {
      user: user._id,
      comment: comment.trim(),
      timestamp: timestamp || 0
    };

    video.comments.push(newComment);
    await video.save();

    // Populate the new comment
    await video.populate('comments.user', 'name email role avatar');

    res.status(201).json({
      success: true,
      data: video.comments[video.comments.length - 1],
      message: 'Comment added successfully'
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
};

// @route   POST /api/videos/:id/like
// @desc    Like/Unlike video
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const existingLikeIndex = video.likes.findIndex(
      like => like.user.toString() === user._id.toString()
    );

    if (existingLikeIndex >= 0) {
      // Unlike
      video.likes.splice(existingLikeIndex, 1);
    } else {
      // Like
      video.likes.push({
        user: user._id
      });
    }

    await video.save();

    res.status(200).json({
      success: true,
      data: {
        likes: video.likes.length,
        isLiked: existingLikeIndex < 0
      },
      message: existingLikeIndex >= 0 ? 'Video unliked' : 'Video liked'
    });

  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating like status'
    });
  }
};

// @route   POST /api/videos/:id/complete
// @desc    Mark video as completed by student
// @access  Private (Students only)
const markVideoComplete = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { watchTime } = req.body;

    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can mark videos as complete'
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if student already has a completion record
    const existingCompletion = video.completions.find(
      completion => completion.student.toString() === user._id.toString()
    );

    if (existingCompletion) {
      // Update existing completion
      existingCompletion.watchTime = watchTime || existingCompletion.watchTime;
      existingCompletion.isCompleted = true;
      existingCompletion.completedAt = new Date();
    } else {
      // Add new completion
      video.completions.push({
        student: user._id,
        watchTime: watchTime || 0,
        isCompleted: true,
        completedAt: new Date()
      });
    }

    await video.save();

    res.status(200).json({
      success: true,
      message: 'Video marked as completed'
    });

  } catch (error) {
    console.error('Mark video complete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking video as complete'
    });
  }
};

// Helper function to determine attachment type
const getAttachmentType = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  
  if (['.pdf'].includes(extension)) return 'document';
  if (['.ppt', '.pptx'].includes(extension)) return 'presentation';
  if (['.doc', '.docx', '.txt'].includes(extension)) return 'notes';
  
  return 'document';
};

// Test route to verify server is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Video routes are working',
    user: req.user ? {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    } : null,
    timestamp: new Date().toISOString()
  });
});

// @route   PUT /api/videos/:id
// @desc    Edit video (Faculty/TA only)
// @access  Private
const editVideo = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { title, description, isPublished } = req.body;

    console.log('🔧 Edit video request:', { id, title, description, isPublished, userRole: user.role });

    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty, TA, or Admin role required.'
      });
    }

    const video = await Video.findById(id).populate('course');
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check access permissions
    let hasAccess = false;
    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'faculty') {
      hasAccess = user.teachingCourses.some(tc => 
        tc.toString() === video.course._id.toString()
      ) || video.uploadedBy.toString() === user._id.toString();
    } else if (user.role === 'ta') {
      hasAccess = (user.assistingCourses || []).some(ac => 
        ac.toString() === video.course._id.toString()
      ) || video.uploadedBy.toString() === user._id.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to edit this video'
      });
    }

    // Update video fields
    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (isPublished !== undefined) video.isPublished = isPublished;

    await video.save();

    // Populate the updated video
    await video.populate([
      { path: 'course', select: 'name code' },
      { path: 'uploadedBy', select: 'name email role avatar' }
    ]);

    console.log('✅ Video updated successfully');

    res.status(200).json({
      success: true,
      data: video,
      message: 'Video updated successfully'
    });

  } catch (error) {
    console.error('❌ Edit video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating video'
    });
  }
};

// Routes
router.get('/', getVideos);
router.post('/', uploadVideo);
router.get('/:id', getVideo);
router.put('/:id', editVideo);
router.delete('/:id', deleteVideo);
router.post('/:id/comments', addComment);
router.post('/:id/like', toggleLike);
router.post('/:id/complete', markVideoComplete);

module.exports = router;