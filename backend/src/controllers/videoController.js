const Video = require('../models/Video');
const Course = require('../models/Course');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const { notifyVideoUploaded, notifyVideoComment } = require('./notificationController');

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'video') {
      cb(null, 'uploads/videos/');
    } else if (file.fieldname === 'attachments') {
      cb(null, 'uploads/documents/');
    } else if (file.fieldname === 'thumbnail') {
      cb(null, 'uploads/thumbnails/');
    } else {
      cb(null, 'uploads/');
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
      const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid video file type. Please upload MP4, AVI, MOV, WMV, or WebM files.'), false);
      }
    } else if (file.fieldname === 'attachments') {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid attachment file type'), false);
      }
    } else if (file.fieldname === 'thumbnail') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid thumbnail file type'), false);
      }
    } else {
      cb(null, true);
    }
  }
});

// @route   GET /api/videos
// @desc    Get videos based on user's courses
// @access  Private
const getVideos = async (req, res) => {
  try {
    const user = req.user;
    const { course, search, limit = 50, page = 1 } = req.query;

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

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const videos = await Video.find(query)
      .populate('course', 'name code')
      .populate('uploadedBy', 'name email role avatar')
      .populate('comments.user', 'name email role avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Video.countDocuments(query);

    res.status(200).json({
      success: true,
      data: videos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
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

      const { title, description, courseId, autoGenerateSubtitles } = req.body;

      // Validate required fields
      if (!title || !courseId || !req.files?.video) {
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
      console.log('🔍 Processing attachments...');
      console.log('📁 req.files:', req.files);
      console.log('📝 req.body:', req.body);
      
      const attachments = [];
      if (req.files?.attachments) {
        console.log(`📎 Found ${req.files.attachments.length} attachments`);
        req.files.attachments.forEach((file, index) => {
          console.log(`📎 Processing attachment ${index}:`, {
            name: file.originalname,
            size: file.size,
            filename: file.filename
          });
          
          attachments.push({
            name: file.originalname,
            type: getAttachmentType(file.originalname),
            url: `/uploads/documents/${file.filename}`,
            size: file.size
          });
        });
      }
      
      console.log('✅ Final attachments array:', attachments);

      // Generate subtitles if requested (placeholder - integrate with speech-to-text service)
      let subtitles = [];
      if (autoGenerateSubtitles === 'true') {
        // Placeholder for AI subtitle generation
        subtitles.push({
          language: 'en',
          url: `/uploads/subtitles/${req.files.video[0].filename}.vtt`,
          isAuto: true
        });
      }

      // Create video record
      const video = new Video({
        title: title.trim(),
        description: description?.trim() || '',
        course: courseId,
        uploadedBy: user._id,
        videoUrl: `/uploads/videos/${req.files.video[0].filename}`,
        thumbnailUrl: req.files?.thumbnail ? `/uploads/thumbnails/${req.files.thumbnail[0].filename}` : null,
        duration: 0, // Would be populated by video processing service
        subtitles,
        attachments,
        isPublished: true,
        viewCount: 0
      });

      await video.save();

      // Populate the video before sending response
      await video.populate([
        { path: 'course', select: 'name code' },
        { path: 'uploadedBy', select: 'name email role avatar' }
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
        message: 'Comment content is required'
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
        message: 'Access denied to comment on this video'
      });
    }

    const newComment = {
      user: user._id,
      comment: comment.trim(),
      timestamp: timestamp || 0,
      createdAt: new Date()
    };

    video.comments.push(newComment);
    await video.save();

    // Populate the new comment
    await video.populate('comments.user', 'name email role avatar');
    const addedComment = video.comments[video.comments.length - 1];

    // Notify video uploader if comment is from someone else
    if (video.uploadedBy.toString() !== user._id.toString()) {
      await notifyVideoComment(addedComment, video, user);
    }

    res.status(201).json({
      success: true,
      data: addedComment,
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
        user: user._id,
        likedAt: new Date()
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

// @route   PUT /api/videos/:id
// @desc    Update video (Faculty/TA only)
// @access  Private
const updateVideo = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { title, description, isPublished } = req.body;

    const video = await Video.findById(id).populate('course');
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check permissions
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
        message: 'Access denied to update this video'
      });
    }

    // Update video
    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (isPublished !== undefined) video.isPublished = isPublished;

    await video.save();

    res.status(200).json({
      success: true,
      data: video,
      message: 'Video updated successfully'
    });

  } catch (error) {
    console.error('Update video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating video'
    });
  }
};

const deleteVideo = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const video = await Video.findById(id).populate('course');
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check permissions
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
        message: 'Access denied to delete this video'
      });
    }

    await Video.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting video'
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

// @route   POST /api/videos/:id/complete
// @desc    Mark video as completed by student
// @access  Private (Students only)
const markVideoComplete = async (req, res) => {
  try {
    const { id } = req.params;
    const { watchTime } = req.body;
    const user = req.user;

    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can mark videos as completed'
      });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    // Check if completion already exists
    const existingCompletion = video.completions.find(
      c => c.student.toString() === user._id.toString()
    );

    if (existingCompletion) {
      // Update existing completion
      existingCompletion.isCompleted = true;
      existingCompletion.watchTime = Math.max(existingCompletion.watchTime || 0, watchTime || 0);
      existingCompletion.completedAt = new Date();
    } else {
      // Add new completion
      video.completions.push({
        student: user._id,
        isCompleted: true,
        watchTime: watchTime || 0,
        completedAt: new Date()
      });
    }

    await video.save();

    res.status(200).json({
      success: true,
      message: 'Video marked as completed',
      data: {
        videoId: video._id,
        isCompleted: true,
        watchTime: watchTime || 0
      }
    });

  } catch (error) {
    console.error('Error marking video complete:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking video as completed'
    });
  }
};

// @route   PUT /api/videos/:id
// @desc    Edit video (Faculty/TA only)
// @access  Private
const editVideo = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { title, description, isPublished } = req.body;

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

    res.status(200).json({
      success: true,
      data: video,
      message: 'Video updated successfully'
    });

  } catch (error) {
    console.error('Edit video error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating video'
    });
  }
};


module.exports = {
  getVideos,
  uploadVideo,
  getVideo,
  addComment,
  toggleLike,
  editVideo,
  deleteVideo,
  markVideoComplete
};