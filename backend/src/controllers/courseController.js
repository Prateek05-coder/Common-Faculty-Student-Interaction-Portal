const Course = require('../models/Course');
const User = require('../models/User');
const Assignment = require('../models/Assignment');
const { ensureCourseRelationships } = require('../utils/courseAccess');
const { fixAccessControl } = require('../scripts/fixAccessControl');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = 'uploads/';
    
    // Determine upload directory based on field name
    if (file.fieldname === 'courseVideo') {
      uploadDir = 'uploads/videos/';
    } else if (file.fieldname === 'courseMaterial') {
      uploadDir = 'uploads/materials/';
    } else if (file.fieldname === 'assignmentFile') {
      uploadDir = 'uploads/assignments/';
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types based on field name
    let allowedTypes;
    
    if (file.fieldname === 'courseVideo') {
      allowedTypes = /mp4|avi|mov|wmv|flv|webm|mkv/;
    } else if (file.fieldname === 'courseMaterial') {
      allowedTypes = /pdf|doc|docx|ppt|pptx|txt|jpg|jpeg|png|gif|xlsx|xls|zip|rar/;
    } else {
      allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png|ppt|pptx/;
    }
    
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${allowedTypes}`));
    }
  }
});

// @route   GET /api/courses
// @desc    Get courses based on user role
// @access  Private
const getCourses = async (req, res) => {
  try {
    console.log('📚 Getting courses for user:', req.user.email, 'Role:', req.user.role);
    
    const user = req.user;
    const { search, semester, year, status } = req.query;
    
    let courses = [];
    let query = { isActive: true };
    
    // Add search filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (semester) query.semester = semester;
    if (year) query.year = parseInt(year);
    if (status === 'published') query.isPublished = true;

    try {
      switch (user.role) {
        case 'admin':
          console.log('🔑 Admin access - fetching all courses');
          courses = await Course.find(query)
            .populate('faculty', 'name email')
            .populate('teachingAssistants', 'name email')
            .populate('enrolledStudents.student', 'name email studentId')
            .sort({ createdAt: -1 })
            .lean();
          break;
          
        case 'faculty':
          console.log('👨‍🏫 Faculty access - fetching teaching courses');
          query.faculty = user._id;
          courses = await Course.find(query)
            .populate('teachingAssistants', 'name email')
            .populate('enrolledStudents.student', 'name email studentId')
            .sort({ createdAt: -1 })
            .lean();
          break;
          
        case 'ta':
          console.log('👨‍🎓 TA access - fetching assisting courses');
          query.teachingAssistants = user._id;
          courses = await Course.find(query)
            .populate('faculty', 'name email')
            .populate('enrolledStudents.student', 'name email studentId')
            .sort({ createdAt: -1 })
            .lean();
          break;
          
        case 'student':
          console.log('👨‍🎓 Student access - fetching enrolled courses');
          query['enrolledStudents.student'] = user._id;
          query['enrolledStudents.status'] = 'active';
          courses = await Course.find(query)
            .populate('faculty', 'name email')
            .populate('teachingAssistants', 'name email')
            .sort({ createdAt: -1 })
            .lean();
          break;
          
        default:
          console.log('❌ Invalid user role:', user.role);
          return res.status(403).json({
            success: false,
            message: 'Invalid user role'
          });
      }

      console.log(`✅ Found ${courses.length} courses for ${user.role}: ${user.email}`);

      // Add computed fields
      courses = courses.map(course => ({
        ...course,
        enrollmentCount: course.enrolledStudents ? course.enrolledStudents.filter(e => e.status === 'active').length : 0,
        userRole: getUserRoleInCourse(course, user._id, user.role)
      }));

      res.status(200).json({
        success: true,
        data: courses,
        count: courses.length,
        message: `Found ${courses.length} courses`
      });

    } catch (dbError) {
      console.error('💥 Database error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load courses: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @route   GET /api/courses/available
// @desc    Get all available courses for enrollment (students can see all published courses)
// @access  Private
const getAvailableCourses = async (req, res) => {
  try {
    console.log('📚 Getting available courses for user:', req.user.email);
    
    const user = req.user;
    const { search, semester, year } = req.query;
    
    let query = { 
      isActive: true, 
      isPublished: true // Only show published courses
    };
    
    // Add search filters
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (semester) query.semester = semester;
    if (year) query.year = parseInt(year);

    const courses = await Course.find(query)
      .populate('faculty', 'name email')
      .populate('teachingAssistants', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Add enrollment status for the current user
    const coursesWithStatus = courses.map(course => {
      let enrollmentStatus = 'not_enrolled';
      let canEnroll = true;
      
      if (user.role === 'student') {
        const isEnrolled = (course.enrolledStudents || []).some(e => 
          e.student && e.student.toString() === user._id.toString() && e.status === 'active'
        );
        enrollmentStatus = isEnrolled ? 'enrolled' : 'not_enrolled';
        canEnroll = !isEnrolled;
      } else {
        canEnroll = false; // Non-students can't enroll
      }

      return {
        ...course,
        enrollmentCount: (course.enrolledStudents || []).filter(e => e.status === 'active').length,
        enrollmentStatus,
        canEnroll,
        userRole: getUserRoleInCourse(course, user._id, user.role)
      };
    });

    console.log(`✅ Found ${coursesWithStatus.length} available courses`);

    res.status(200).json({
      success: true,
      data: coursesWithStatus,
      count: coursesWithStatus.length,
      message: `Found ${coursesWithStatus.length} available courses`
    });

  } catch (error) {
    console.error('💥 Get available courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load available courses: ' + error.message
    });
  }
};

// Helper function to determine user role in course
const getUserRoleInCourse = (course, userId, userRole) => {
  const userIdStr = userId.toString();
  
  if (userRole === 'admin') return 'admin';
  if (course.faculty && course.faculty._id && course.faculty._id.toString() === userIdStr) return 'instructor';
  if (course.teachingAssistants && course.teachingAssistants.some(ta => ta._id && ta._id.toString() === userIdStr)) return 'ta';
  if (course.enrolledStudents && course.enrolledStudents.some(e => e.student && e.student._id && e.student._id.toString() === userIdStr)) return 'student';
  
  return 'none';
};

// @route   POST /api/courses
// @desc    Create new course (Faculty only)
// @access  Private
const createCourse = async (req, res) => {
  try {
    console.log('📝 Creating course request from:', req.user.email);
    console.log('📝 Request body:', req.body);
    
    const user = req.user;
    
    // Only faculty can create courses
    if (user.role !== 'faculty') {
      console.log('❌ Non-faculty user trying to create course:', user.role);
      return res.status(403).json({
        success: false,
        message: 'Only faculty members can create courses'
      });
    }

    const { name, code, description, semester, year, credits, maxStudents, tags } = req.body;

    // Validate required fields - FIXED: Allow empty description
    if (!name || name.trim() === '') {
      console.log('❌ Missing name field');
      return res.status(400).json({
        success: false,
        message: 'Course name is required'
      });
    }

    if (!code || code.trim() === '') {
      console.log('❌ Missing code field');
      return res.status(400).json({
        success: false,
        message: 'Course code is required'
      });
    }

    // Description can be empty string - that's fine
    if (description === undefined || description === null) {
      console.log('❌ Description field is missing');
      return res.status(400).json({
        success: false,
        message: 'Course description field is required (can be empty)'
      });
    }

    if (!semester || semester.trim() === '') {
      console.log('❌ Missing semester field');
      return res.status(400).json({
        success: false,
        message: 'Semester is required'
      });
    }

    if (!year) {
      console.log('❌ Missing year field');
      return res.status(400).json({
        success: false,
        message: 'Year is required'
      });
    }

    if (!credits) {
      console.log('❌ Missing credits field');
      return res.status(400).json({
        success: false,
        message: 'Credits are required'
      });
    }

    // Validate data types and ranges
    if (isNaN(year) || year < 2020 || year > 2030) {
      return res.status(400).json({
        success: false,
        message: 'Year must be a number between 2020 and 2030'
      });
    }

    if (isNaN(credits) || credits < 1 || credits > 6) {
      return res.status(400).json({
        success: false,
        message: 'Credits must be a number between 1 and 6'
      });
    }

    try {
      // Check if course code already exists
      const existingCourse = await Course.findOne({ 
        code: code.toUpperCase().trim(),
        isActive: true
      });
      
      if (existingCourse) {
        console.log('❌ Course code already exists:', code);
        return res.status(400).json({
          success: false,
          message: `Course code '${code.toUpperCase()}' already exists`
        });
      }

      // Create course data - FIXED: Handle empty description
      const courseData = {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        description: description.trim() || 'No description provided', // Handle empty description
        semester,
        year: parseInt(year),
        credits: parseInt(credits),
        faculty: user._id,
        maxStudents: maxStudents ? parseInt(maxStudents) : 50,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        isActive: true,
        isPublished: true,
        enrolledStudents: [],
        teachingAssistants: [],
        schedule: [],
        materials: [],
        videoLectures: [],
        announcements: [],
        stats: {
          totalAssignments: 0,
          totalMaterials: 0,
          totalVideos: 0,
          totalEnrollments: 0,
          averageGrade: null,
          completionRate: 0
        }
      };

      console.log('📝 Creating course with data:', courseData);

      // Create and save course
      const course = new Course(courseData);
      const savedCourse = await course.save();

      console.log('✅ Course saved with ID:', savedCourse._id);

      // Update faculty's teaching courses
      await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { teachingCourses: savedCourse._id } },
        { new: true }
      );

      // Populate the created course
      const populatedCourse = await Course.findById(savedCourse._id)
        .populate('faculty', 'name email')
        .populate('teachingAssistants', 'name email')
        .lean();

      console.log('✅ Course created successfully:', savedCourse.code);

      // Ensure proper course relationships are established
      try {
        await ensureCourseRelationships(savedCourse._id);
        console.log('✅ Course relationships verified for:', savedCourse.code);
      } catch (relationshipError) {
        console.error('⚠️ Error ensuring course relationships:', relationshipError);
        // Don't fail course creation if relationship check fails
      }

      res.status(201).json({
        success: true,
        data: populatedCourse,
        message: `Course '${populatedCourse.code}' created successfully`
      });

    } catch (dbError) {
      console.error('💥 Database error during creation:', dbError);
      
      if (dbError.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Course code must be unique'
        });
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Create course error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create course: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @route   GET /api/courses/my-courses
// @desc    Get simplified list of user's courses for dropdowns
// @access  Private
const getMyCourses = async (req, res) => {
  try {
    console.log('📋 Getting my courses for:', req.user.email, 'Role:', req.user.role);
    
    const user = req.user;
    let courses = [];

    try {
      switch (user.role) {
        case 'faculty':
          courses = await Course.find({ 
            faculty: user._id, 
            isActive: true 
          })
          .select('_id name code semester year')
          .sort({ name: 1 })
          .lean();
          break;
          
        case 'ta':
          courses = await Course.find({ 
            teachingAssistants: user._id, 
            isActive: true 
          })
          .select('_id name code semester year')
          .populate('faculty', 'name')
          .sort({ name: 1 })
          .lean();
          break;
          
        case 'student':
          courses = await Course.find({ 
            'enrolledStudents.student': user._id,
            'enrolledStudents.status': 'active',
            isActive: true 
          })
          .select('_id name code semester year')
          .populate('faculty', 'name')
          .sort({ name: 1 })
          .lean();
          break;
          
        case 'admin':
          courses = await Course.find({ isActive: true })
          .select('_id name code semester year')
          .populate('faculty', 'name')
          .sort({ name: 1 })
          .lean();
          break;
          
        default:
          console.log('❌ Invalid role for my-courses:', user.role);
          return res.status(403).json({
            success: false,
            message: 'Invalid user role'
          });
      }

      console.log(`✅ Found ${courses.length} courses for dropdown`);

      res.status(200).json({
        success: true,
        data: courses,
        count: courses.length
      });

    } catch (dbError) {
      console.error('💥 Database error in my-courses:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Get my courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load courses: ' + error.message
    });
  }
};

// @route   GET /api/courses/:id
// @desc    Get course by ID with full details
// @access  Private
const getCourseById = async (req, res) => {
  try {
    console.log('🔍 Getting course by ID:', req.params.id);
    
    const { id } = req.params;
    const user = req.user;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID format'
      });
    }

    try {
      const course = await Course.findById(id)
        .populate('faculty', 'name email profile')
        .populate('teachingAssistants', 'name email profile')
        .populate('enrolledStudents.student', 'name email studentId profile')
        .populate('materials.uploadedBy', 'name email')
        .populate('videoLectures.uploadedBy', 'name email')
        .populate('announcements.author', 'name email')
        .populate('schedule.createdBy', 'name email')
        .lean();

      if (!course) {
        console.log('❌ Course not found:', id);
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user can access this course
      const canAccess = checkCourseAccess(course, user._id, user.role);
      
      if (!canAccess) {
        console.log('❌ Access denied to course:', id, 'for user:', user.email);
        return res.status(403).json({
          success: false,
          message: 'Access denied to this course'
        });
      }

      // Add user role in course
      course.userRole = getUserRoleInCourse(course, user._id, user.role);
      course.enrollmentCount = course.enrolledStudents ? course.enrolledStudents.filter(e => e.status === 'active').length : 0;

      console.log('✅ Course retrieved successfully:', course.code);

      res.status(200).json({
        success: true,
        data: course
      });

    } catch (dbError) {
      console.error('💥 Database error in getCourseById:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Get course by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load course: ' + error.message
    });
  }
};

// Helper function to check course access
const checkCourseAccess = (course, userId, userRole) => {
  const userIdStr = userId.toString();
  
  // Admin can access all courses
  if (userRole === 'admin') return true;
  
  // Faculty can access their own courses
  if (userRole === 'faculty' && course.faculty && course.faculty._id.toString() === userIdStr) return true;
  
  // TA can access assigned courses
  if (userRole === 'ta' && course.teachingAssistants && course.teachingAssistants.some(ta => ta._id.toString() === userIdStr)) return true;
  
  // Students can access enrolled courses
  if (userRole === 'student' && course.enrolledStudents && course.enrolledStudents.some(e => 
    e.student && e.student._id.toString() === userIdStr && e.status === 'active'
  )) return true;
  
  return false;
};

// Other methods remain the same...
const uploadCourseMaterial = async (req, res) => {
  try {
    console.log('📎 Uploading material to course:', req.params.id);
    
    const { id } = req.params;
    const user = req.user;
    const { title, description, category } = req.body;

    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and TAs can upload course materials'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check if user can upload to this course
      const canUpload = course.faculty.toString() === user._id.toString() || 
                       course.teachingAssistants.includes(user._id) ||
                       user.role === 'admin';
      
      if (!canUpload) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this course'
        });
      }

      const material = {
        title: title || req.file.originalname,
        description: description || '',
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: `/uploads/materials/${req.file.filename}`,
        fileType: path.extname(req.file.originalname).toLowerCase(),
        fileSize: req.file.size,
        category: category || 'other',
        uploadedBy: user._id,
        uploadedAt: new Date(),
        isVisible: true,
        downloadCount: 0
      };

      course.materials.push(material);
      await course.save();

      console.log('✅ Material uploaded successfully:', material.title);

      res.status(201).json({
        success: true,
        data: material,
        message: 'Course material uploaded successfully'
      });

    } catch (dbError) {
      console.error('💥 Database error in upload material:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Upload material error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload material: ' + error.message
    });
  }
};

// Additional controller methods...
const uploadVideoLecture = async (req, res) => {
  try {
    console.log('🎥 Uploading video to course:', req.params.id);
    
    const { id } = req.params;
    const user = req.user;
    const { title, description, quality } = req.body;

    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and TAs can upload video lectures'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    try {
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check access
      const canUpload = course.faculty.toString() === user._id.toString() || 
                       course.teachingAssistants.includes(user._id) ||
                       user.role === 'admin';
      
      if (!canUpload) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this course'
        });
      }

      const videoLecture = {
        title: title || req.file.originalname,
        description: description || '',
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileUrl: `/uploads/videos/${req.file.filename}`,
        thumbnailUrl: '', // TODO: Generate thumbnail
        duration: 0, // TODO: Extract video duration
        subtitlesUrl: '', // TODO: Generate subtitles
        quality: quality || '720p',
        uploadedBy: user._id,
        uploadedAt: new Date(),
        isVisible: true,
        viewCount: 0,
        likes: []
      };

      course.videoLectures.push(videoLecture);
      await course.save();

      console.log('✅ Video uploaded successfully:', videoLecture.title);

      res.status(201).json({
        success: true,
        data: videoLecture,
        message: 'Video lecture uploaded successfully'
      });

    } catch (dbError) {
      console.error('💥 Database error in upload video:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Upload video error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload video: ' + error.message
    });
  }
};

const getCourseMaterials = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    try {
      const course = await Course.findById(id)
        .populate('materials.uploadedBy', 'name email')
        .select('materials name code faculty teachingAssistants enrolledStudents')
        .lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check access
      const canAccess = checkCourseAccess(course, user._id, user.role);
      
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this course'
        });
      }

      const materials = course.materials.filter(material => material.isVisible);

      res.status(200).json({
        success: true,
        data: materials,
        count: materials.length
      });

    } catch (dbError) {
      console.error('💥 Database error in get materials:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Get materials error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load materials: ' + error.message
    });
  }
};

const getVideoLectures = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    try {
      const course = await Course.findById(id)
        .populate('videoLectures.uploadedBy', 'name email')
        .select('videoLectures name code faculty teachingAssistants enrolledStudents')
        .lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check access
      const canAccess = checkCourseAccess(course, user._id, user.role);
      
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this course'
        });
      }

      const videos = course.videoLectures.filter(video => video.isVisible);

      res.status(200).json({
        success: true,
        data: videos,
        count: videos.length
      });

    } catch (dbError) {
      console.error('💥 Database error in get videos:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load videos: ' + error.message
    });
  }
};

const addScheduleItem = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { type, title, description, date, startTime, endTime, location, isRecurring } = req.body;

    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and TAs can add schedule items'
      });
    }

    if (!type || !title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, and date are required'
      });
    }

    try {
      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      const canAccess = course.faculty.toString() === user._id.toString() || 
                       course.teachingAssistants.includes(user._id) ||
                       user.role === 'admin';
      
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this course'
        });
      }

      const scheduleItem = {
        type,
        title: title.trim(),
        description: description ? description.trim() : '',
        date: new Date(date),
        startTime: startTime || '',
        endTime: endTime || '',
        location: location ? location.trim() : '',
        isRecurring: isRecurring || false,
        createdBy: user._id,
        createdAt: new Date()
      };

      course.schedule.push(scheduleItem);
      await course.save();

      console.log('✅ Schedule item added:', scheduleItem.title);

      res.status(201).json({
        success: true,
        data: scheduleItem,
        message: 'Schedule item added successfully'
      });

    } catch (dbError) {
      console.error('💥 Database error in add schedule:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Add schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add schedule item: ' + error.message
    });
  }
};

const getCourseSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    try {
      const course = await Course.findById(id)
        .populate('schedule.createdBy', 'name email')
        .select('schedule name code faculty teachingAssistants enrolledStudents')
        .lean();

      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        });
      }

      // Check access
      const canAccess = checkCourseAccess(course, user._id, user.role);
      
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this course'
        });
      }

      const schedule = course.schedule.sort((a, b) => new Date(a.date) - new Date(b.date));

      res.status(200).json({
        success: true,
        data: schedule,
        count: schedule.length
      });

    } catch (dbError) {
      console.error('💥 Database error in get schedule:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load schedule: ' + error.message
    });
  }
};

// @route   POST /api/courses/:id/enroll
// @desc    Enroll student in course
// @access  Private (Students only)
const enrollInCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    console.log(`📝 Enrollment request: Student ${user.email} wants to enroll in course ${id}`);

    // Only students can enroll
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can enroll in courses'
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!course.isActive || !course.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Course is not available for enrollment'
      });
    }

    // Check if already enrolled
    const isAlreadyEnrolled = (course.enrolledStudents || []).some(e => 
      e.student.toString() === user._id.toString() && e.status === 'active'
    );

    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in this course'
      });
    }

    // Check enrollment limit
    const currentEnrollment = (course.enrolledStudents || []).filter(e => e.status === 'active').length;
    if (course.maxStudents && currentEnrollment >= course.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Course enrollment is full'
      });
    }

    // Add student to course
    course.enrolledStudents.push({
      student: user._id,
      enrolledAt: new Date(),
      status: 'active'
      // grade will be null by default and is allowed in enum
    });

    await course.save();

    // Add course to student's enrolled courses
    await User.findByIdAndUpdate(
      user._id,
      { 
        $addToSet: { 
          enrolledCourses: {
            course: course._id,
            enrolledAt: new Date()
          }
        }
      }
    );

    console.log(`✅ Student ${user.email} enrolled in course ${course.code}`);

    res.status(200).json({
      success: true,
      message: `Successfully enrolled in ${course.code} - ${course.name}`
    });

  } catch (error) {
    console.error('💥 Enroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course: ' + error.message
    });
  }
};

// @route   POST /api/courses/:id/unenroll
// @desc    Unenroll student from course
// @access  Private (Students only)
const unenrollFromCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    console.log(`📝 Unenrollment request: Student ${user.email} wants to unenroll from course ${id}`);

    // Only students can unenroll
    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can unenroll from courses'
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if enrolled
    const enrollmentIndex = (course.enrolledStudents || []).findIndex(e => 
      e.student.toString() === user._id.toString() && e.status === 'active'
    );

    if (enrollmentIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Remove student from course (set status to inactive)
    course.enrolledStudents[enrollmentIndex].status = 'inactive';
    course.enrolledStudents[enrollmentIndex].unenrolledAt = new Date();

    await course.save();

    // Remove course from student's enrolled courses
    await User.findByIdAndUpdate(
      user._id,
      { 
        $pull: { 
          enrolledCourses: { course: course._id }
        }
      }
    );

    console.log(`✅ Student ${user.email} unenrolled from course ${course.code}`);

    res.status(200).json({
      success: true,
      message: `Successfully unenrolled from ${course.code} - ${course.name}`
    });

  } catch (error) {
    console.error('💥 Unenroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unenroll from course: ' + error.message
    });
  }
};

// @route   POST /api/courses/:id/assign-ta
// @desc    Assign TA to course
// @access  Private (Faculty and Admin only)
const assignTA = async (req, res) => {
  try {
    const { id } = req.params;
    const { taId } = req.body;
    const user = req.user;

    if (!['faculty', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and admins can assign TAs'
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user has permission to modify this course
    if (user.role === 'faculty' && course.faculty.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign TAs to your own courses'
      });
    }

    // Verify TA exists and has correct role
    const ta = await User.findById(taId);
    if (!ta || ta.role !== 'ta') {
      return res.status(400).json({
        success: false,
        message: 'Invalid TA selected'
      });
    }

    // Check if TA is already assigned
    if (course.teachingAssistants.includes(taId)) {
      return res.status(400).json({
        success: false,
        message: 'TA is already assigned to this course'
      });
    }

    // Add TA to course
    course.teachingAssistants.push(taId);
    await course.save();

    console.log(`✅ TA ${ta.name} assigned to course ${course.code}`);

    res.status(200).json({
      success: true,
      message: 'TA assigned successfully'
    });

  } catch (error) {
    console.error('💥 Assign TA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign TA: ' + error.message
    });
  }
};

// @route   POST /api/courses/:id/remove-ta
// @desc    Remove TA from course
// @access  Private (Faculty and Admin only)
const removeTA = async (req, res) => {
  try {
    const { id } = req.params;
    const { taId } = req.body;
    const user = req.user;

    if (!['faculty', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and admins can remove TAs'
      });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user has permission to modify this course
    if (user.role === 'faculty' && course.faculty.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove TAs from your own courses'
      });
    }

    // Remove TA from course
    course.teachingAssistants = course.teachingAssistants.filter(
      ta => ta.toString() !== taId
    );
    await course.save();

    console.log(`✅ TA removed from course ${course.code}`);

    res.status(200).json({
      success: true,
      message: 'TA removed successfully'
    });

  } catch (error) {
    console.error('💥 Remove TA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove TA: ' + error.message
    });
  }
};

// @route   POST /api/courses/debug-relationships
// @desc    Debug and fix course relationships (Admin only)
// @access  Private (Admin only)
const debugCourseRelationships = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can debug course relationships'
      });
    }

    console.log('🔧 Starting course relationships debug and fix...');

    // Get all courses
    const courses = await Course.find({})
      .populate('faculty', 'name email')
      .populate('teachingAssistants', 'name email');

    const results = [];

    for (const course of courses) {
      const courseResult = {
        courseId: course._id,
        courseCode: course.code,
        courseName: course.name,
        issues: [],
        fixes: []
      };

      // Check faculty relationship
      if (!course.faculty) {
        courseResult.issues.push('No faculty assigned');
      } else {
        console.log(`✅ Course ${course.code} has faculty: ${course.faculty.name}`);
      }

      // Ensure teachingAssistants array exists
      if (!course.teachingAssistants) {
        courseResult.issues.push('Missing teachingAssistants array');
        course.teachingAssistants = [];
        courseResult.fixes.push('Added teachingAssistants array');
      }

      // Ensure enrolledStudents array exists
      if (!course.enrolledStudents) {
        courseResult.issues.push('Missing enrolledStudents array');
        course.enrolledStudents = [];
        courseResult.fixes.push('Added enrolledStudents array');
      }

      // Save fixes if any
      if (courseResult.fixes.length > 0) {
        await course.save();
        console.log(`🔧 Fixed ${courseResult.fixes.length} issues for course ${course.code}`);
      }

      results.push(courseResult);
    }

    console.log('✅ Course relationships debug completed');

    res.status(200).json({
      success: true,
      data: {
        totalCourses: courses.length,
        coursesWithIssues: results.filter(r => r.issues.length > 0).length,
        coursesFixed: results.filter(r => r.fixes.length > 0).length,
        details: results
      },
      message: 'Course relationships debug completed'
    });

  } catch (error) {
    console.error('💥 Debug course relationships error:', error);
    res.status(500).json({
      success: false,
      message: 'Error debugging course relationships: ' + error.message
    });
  }
};

// @route   POST /api/courses/fix-access-control
// @desc    Run comprehensive access control fix (Admin only)
// @access  Private (Admin only)
const runAccessControlFix = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can run access control fixes'
      });
    }

    console.log('🔧 Admin initiated access control fix...');

    const result = await fixAccessControl();

    res.status(200).json({
      success: true,
      data: result,
      message: 'Access control fix completed successfully'
    });

  } catch (error) {
    console.error('💥 Access control fix error:', error);
    res.status(500).json({
      success: false,
      message: 'Error running access control fix: ' + error.message
    });
  }
};

module.exports = {
  getCourses,
  createCourse,
  getAvailableCourses,
  enrollInCourse,
  unenrollFromCourse,
  getMyCourses,
  getCourseById,
  uploadCourseMaterial,
  uploadVideoLecture,
  getCourseMaterials,
  getVideoLectures,
  addScheduleItem,
  getCourseSchedule,
  assignTA,
  removeTA,
  debugCourseRelationships,
  runAccessControlFix,
  upload
};