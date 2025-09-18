const Course = require('../models/Course');
const User = require('../models/User');

// @route   GET /api/courses/teaching
// @desc    Get courses that faculty is teaching
// @access  Private (Faculty only)
const getTeachingCourses = async (req, res) => {
  try {
    console.log('👨‍🏫 Getting teaching courses for faculty:', req.user.email);
    
    const facultyId = req.user._id;

    // Only faculty can access teaching courses
    if (req.user.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty can access teaching courses'
      });
    }

    const courses = await Course.find({ 
      faculty: facultyId, 
      isActive: true 
    })
    .populate('enrolledStudents.student', 'name email studentId')
    .populate('teachingAssistants', 'name email')
    .sort({ createdAt: -1 })
    .lean();

    // Add computed fields
    const coursesWithStats = courses.map(course => ({
      ...course,
      enrollmentCount: course.enrolledStudents ? course.enrolledStudents.filter(e => e.status === 'active').length : 0,
      materialsCount: course.materials ? course.materials.filter(m => m.isVisible).length : 0,
      videosCount: course.videoLectures ? course.videoLectures.filter(v => v.isVisible).length : 0,
      userRole: 'instructor'
    }));

    console.log(`✅ Found ${coursesWithStats.length} teaching courses`);

    res.status(200).json({
      success: true,
      data: coursesWithStats,
      count: coursesWithStats.length
    });

  } catch (error) {
    console.error('💥 Get teaching courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load teaching courses: ' + error.message
    });
  }
};

// @route   GET /api/courses/enrolled  
// @desc    Get courses that student is enrolled in
// @access  Private (Student only)
const getEnrolledCourses = async (req, res) => {
  try {
    console.log('🎓 Getting enrolled courses for student:', req.user.email);
    
    const studentId = req.user._id;

    // Only students can access enrolled courses
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can access enrolled courses'
      });
    }

    const courses = await Course.find({ 
      'enrolledStudents.student': studentId,
      'enrolledStudents.status': 'active',
      isActive: true 
    })
    .populate('faculty', 'name email')
    .populate('teachingAssistants', 'name email')
    .sort({ createdAt: -1 })
    .lean();

    // Add computed fields
    const coursesWithStats = courses.map(course => ({
      ...course,
      enrollmentCount: course.enrolledStudents ? course.enrolledStudents.filter(e => e.status === 'active').length : 0,
      materialsCount: course.materials ? course.materials.filter(m => m.isVisible).length : 0,
      videosCount: course.videoLectures ? course.videoLectures.filter(v => v.isVisible).length : 0,
      userRole: 'student'
    }));

    console.log(`✅ Found ${coursesWithStats.length} enrolled courses`);

    res.status(200).json({
      success: true,
      data: coursesWithStats,
      count: coursesWithStats.length
    });

  } catch (error) {
    console.error('💥 Get enrolled courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load enrolled courses: ' + error.message
    });
  }
};

// @route   GET /api/courses/assisting
// @desc    Get courses that TA is assisting with  
// @access  Private (TA only)
const getAssistingCourses = async (req, res) => {
  try {
    console.log('👨‍🎓 Getting assisting courses for TA:', req.user.email);
    
    const taId = req.user._id;

    // Only TAs can access assisting courses
    if (req.user.role !== 'ta') {
      return res.status(403).json({
        success: false,
        message: 'Only TAs can access assisting courses'
      });
    }

    const courses = await Course.find({ 
      teachingAssistants: taId,
      isActive: true 
    })
    .populate('faculty', 'name email')
    .populate('enrolledStudents.student', 'name email studentId')
    .sort({ createdAt: -1 })
    .lean();

    // Add computed fields
    const coursesWithStats = courses.map(course => ({
      ...course,
      enrollmentCount: course.enrolledStudents ? course.enrolledStudents.filter(e => e.status === 'active').length : 0,
      materialsCount: course.materials ? course.materials.filter(m => m.isVisible).length : 0,
      videosCount: course.videoLectures ? course.videoLectures.filter(v => v.isVisible).length : 0,
      userRole: 'ta'
    }));

    console.log(`✅ Found ${coursesWithStats.length} assisting courses`);

    res.status(200).json({
      success: true,
      data: coursesWithStats,
      count: coursesWithStats.length
    });

  } catch (error) {
    console.error('💥 Get assisting courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load assisting courses: ' + error.message
    });
  }
};

module.exports = {
  getTeachingCourses,
  getEnrolledCourses,
  getAssistingCourses
};