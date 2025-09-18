const express = require('express');
const Video = require('../models/Video');
const Course = require('../models/Course');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const { notifyVideoUploaded } = require('../controllers/notificationController');

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'attachments') {
      cb(null, 'uploads/documents/');
    } else {
      cb(null, 'uploads/thumbnails/');
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
      accessibleCourses = user.enrolledCourses.map(ec => ec.course);
    } else if (user.role === 'faculty') {
      accessibleCourses = user.teachingCourses;
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

      // Check course access
      let hasAccess = false;
      if (user.role === 'faculty') {
        hasAccess = user.teachingCourses.some(tc => tc.toString() === courseId);
      } else if (user.role === 'ta') {
        hasAccess = (user.assistingCourses || []).some(ac => ac.toString() === courseId);
      } else if (user.role === 'admin') {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to upload videos for this course'
        });
      }

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
      console.error('Upload video error:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading video'
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

    // Check access permissions
    let hasAccess = false;
    
    if (user.role === 'student') {
      hasAccess = user.enrolledCourses.some(ec => 
        ec.course.toString() === video.course._id.toString()
      );
    } else if (user.role === 'faculty') {
      hasAccess = user.teachingCourses.some(tc => 
        tc.toString() === video.course._id.toString()
      );
    } else if (user.role === 'ta') {
      hasAccess = (user.assistingCourses || []).some(ac => 
        ac.toString() === video.course._id.toString()
      );
    } else if (user.role === 'admin') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this video'
      });
    }

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

    // Check access permissions (same as getVideo)
    let hasAccess = false;
    
    if (user.role === 'student') {
      hasAccess = user.enrolledCourses.some(ec => 
        ec.course.toString() === video.course.toString()
      );
    } else if (user.role === 'faculty') {
      hasAccess = user.teachingCourses.some(tc => 
        tc.toString() === video.course.toString()
      );
    } else if (user.role === 'ta') {
      hasAccess = (user.assistingCourses || []).some(ac => 
        ac.toString() === video.course.toString()
      );
    } else if (user.role === 'admin') {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to comment on this video'
      });
    }

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

// Helper function to determine attachment type
const getAttachmentType = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  
  if (['.pdf'].includes(extension)) return 'document';
  if (['.ppt', '.pptx'].includes(extension)) return 'presentation';
  if (['.doc', '.docx', '.txt'].includes(extension)) return 'notes';
  
  return 'document';
};

// Routes
router.get('/', getVideos);
router.post('/', uploadVideo);
router.get('/:id', getVideo);
router.post('/:id/comments', addComment);
router.post('/:id/like', toggleLike);

module.exports = router;