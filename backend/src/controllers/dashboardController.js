const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

// @route   GET /api/dashboard/student-stats
// @desc    Get student dashboard statistics WITH enrolledCourses field
// @access  Private (Student only)
const getStudentStats = async (req, res) => {
  try {
    console.log('📊 Getting student stats for:', req.user.email);
    
    const studentId = req.user._id;

    try {
      // Get student's enrolled courses with proper error handling
      const courses = await Course.find({ 
        'enrolledStudents.student': studentId,
        'enrolledStudents.status': 'active',
        isActive: true 
      }).populate('faculty', 'name email');

      console.log(`📚 Found ${courses.length} enrolled courses for student`);

      // Get assignments for student's courses
      const courseIds = courses.map(c => c._id);
      const assignments = await Assignment.find({ 
        course: { $in: courseIds },
        isPublished: true,
        isActive: true
      });

      console.log(`📝 Found ${assignments.length} assignments for student`);

      // Count submissions and grades
      let submittedCount = 0;
      let gradedCount = 0;
      let totalGradePoints = 0;
      let gradedAssignments = 0;

      assignments.forEach(assignment => {
        const submissions = assignment.submissions || [];
        const submission = submissions.find(s => s.student.toString() === studentId.toString());
        if (submission) {
          submittedCount++;
          if (submission.isGraded) {
            gradedCount++;
            if (submission.grade !== undefined) {
              totalGradePoints += submission.grade;
              gradedAssignments++;
            }
          }
        }
      });

      const averageGrade = gradedAssignments > 0 ? (totalGradePoints / gradedAssignments).toFixed(2) : 0;

      // CRITICAL: This structure matches EXACTLY what StudentDashboard.js expects
      const stats = {
        // Core statistics (these are what the dashboard displays)
        enrolledCourses: courses.length,  // NUMBER for stat display
        totalAssignments: assignments.length,
        submittedAssignments: submittedCount,
        gradedAssignments: gradedCount,
        pendingAssignments: assignments.length - submittedCount,
        averageGrade: parseFloat(averageGrade),
        
        // CRITICAL: courses field that StudentDashboard.js maps over
        courses: courses.map(course => ({
          _id: course._id,
          name: course.name,
          code: course.code,
          faculty: course.faculty ? { name: course.faculty.name } : null,
          facultyName: course.faculty ? course.faculty.name : 'Unknown',
          facultyEmail: course.faculty ? course.faculty.email : '',
          semester: course.semester,
          year: course.year,
          enrollmentStatus: 'active',
          description: course.description || '',
          credits: course.credits || 0,
          enrolledStudents: course.enrolledStudents || [],
          // Additional fields that might be useful
          materialsCount: course.materials ? course.materials.filter(m => m.isVisible).length : 0,
          videosCount: course.videoLectures ? course.videoLectures.filter(v => v.isVisible).length : 0
        })),
        
        // Additional dashboard data
        upcomingDeadlines: [],
        recentActivity: {
          forums: [],
          videos: []
        },

        // Recent assignments
        recentAssignments: assignments.slice(0, 5).map(assignment => ({
          _id: assignment._id,
          title: assignment.title,
          dueDate: assignment.dueDate,
          course: assignment.course,
          maxPoints: assignment.maxPoints,
          isSubmitted: (assignment.submissions || []).some(s => s.student.toString() === studentId.toString())
        }))
      };

      console.log('✅ Student stats structure:', {
        totalCourses: stats.totalCourses,
        enrolledCoursesCount: stats.enrolledCourses.length,
        hasEnrolledCourses: !!stats.enrolledCourses,
        enrolledCoursesType: typeof stats.enrolledCourses
      });

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (dbError) {
      console.error('💥 Database error in student stats:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Get student stats error:', error);
    
    // CRITICAL: Always return a valid structure to prevent frontend crashes
    const safeStats = {
      totalCourses: 0,
      totalAssignments: 0,
      submittedAssignments: 0,
      gradedAssignments: 0,
      pendingAssignments: 0,
      averageGrade: 0,
      enrolledCourses: [], // CRITICAL: This prevents the undefined error
      courses: [],
      recentAssignments: []
    };

    res.status(200).json({
      success: false,
      message: 'Failed to load student statistics: ' + error.message,
      data: safeStats // Return safe structure even on error
    });
  }
};

// @route   GET /api/dashboard/faculty-stats
// @desc    Get faculty dashboard statistics
// @access  Private (Faculty only)
const getFacultyStats = async (req, res) => {
  try {
    console.log('📊 Getting faculty stats for:', req.user.email);
    
    const facultyId = req.user._id;

    // Get faculty's courses
    const courses = await Course.find({ 
      faculty: facultyId, 
      isActive: true 
    }).populate('enrolledStudents.student', 'name email');

    // Get total enrolled students across all courses
    let totalStudents = 0;
    courses.forEach(course => {
      totalStudents += (course.enrolledStudents || []).filter(e => e.status === 'active').length;
    });

    // Get assignments for faculty's courses
    const courseIds = courses.map(c => c._id);
    const assignments = await Assignment.find({ 
      course: { $in: courseIds },
      isActive: true
    }).populate('submissions.student', 'name email');

    // Count pending submissions (ungraded)
    let pendingSubmissions = 0;
    assignments.forEach(assignment => {
      pendingSubmissions += (assignment.submissions || []).filter(s => !s.isGraded).length;
    });

    // Recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAssignments = assignments.filter(a => a.createdAt >= weekAgo);

    const stats = {
      totalCourses: courses.length,
      totalStudents: totalStudents,
      totalAssignments: assignments.length,
      pendingGrading: pendingSubmissions,
      recentAssignments: recentAssignments.length,
      averageEnrollment: courses.length > 0 ? Math.round(totalStudents / courses.length) : 0,
      courses: courses.map(course => ({
        _id: course._id,
        name: course.name,
        code: course.code,
        enrollmentCount: (course.enrolledStudents || []).filter(e => e.status === 'active').length,
        semester: course.semester,
        year: course.year
      }))
    };

    console.log('✅ Faculty stats loaded successfully');

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('💥 Get faculty stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load faculty statistics: ' + error.message
    });
  }
};

// @route   GET /api/dashboard/ta-stats
// @desc    Get TA dashboard statistics
// @access  Private (TA only) 
const getTAStats = async (req, res) => {
  try {
    console.log('📊 Getting TA stats for:', req.user.email);
    
    const taId = req.user._id;

    // Get TA's assigned courses
    const courses = await Course.find({ 
      teachingAssistants: taId,
      isActive: true 
    }).populate('faculty', 'name email')
      .populate('enrolledStudents.student', 'name email');

    // Get total students across assigned courses
    let totalStudents = 0;
    courses.forEach(course => {
      totalStudents += (course.enrolledStudents || []).filter(e => e.status === 'active').length;
    });

    // Get assignments for TA's courses
    const courseIds = courses.map(c => c._id);
    const assignments = await Assignment.find({ 
      course: { $in: courseIds },
      isActive: true
    });

    // Count pending submissions
    let pendingSubmissions = 0;
    assignments.forEach(assignment => {
      pendingSubmissions += (assignment.submissions || []).filter(s => !s.isGraded).length;
    });

    const stats = {
      totalCourses: courses.length,
      totalStudents: totalStudents,
      totalAssignments: assignments.length,
      pendingGrading: pendingSubmissions,
      courses: courses.map(course => ({
        _id: course._id,
        name: course.name,
        code: course.code,
        faculty: course.faculty ? course.faculty.name : 'Unknown',
        enrollmentCount: (course.enrolledStudents || []).filter(e => e.status === 'active').length,
        semester: course.semester,
        year: course.year
      }))
    };

    console.log('✅ TA stats loaded successfully');

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('💥 Get TA stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load TA statistics: ' + error.message
    });
  }
};

// @route   GET /api/dashboard/admin-stats
// @desc    Get admin dashboard statistics
// @access  Private (Admin only)
const getAdminStats = async (req, res) => {
  try {
    console.log('📊 Getting admin stats for:', req.user.email);

    // Get all system statistics
    const totalCourses = await Course.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalAssignments = await Assignment.countDocuments({ isActive: true });

    // Get user breakdown by role
    const usersByRole = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const roleStats = {};
    usersByRole.forEach(item => {
      roleStats[item._id] = item.count;
    });

    // Recent activity
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCourses = await Course.countDocuments({ 
      createdAt: { $gte: weekAgo },
      isActive: true
    });

    const stats = {
      totalCourses,
      totalUsers,
      totalAssignments,
      totalFaculty: roleStats.faculty || 0,
      totalStudents: roleStats.student || 0,
      totalTAs: roleStats.ta || 0,
      recentCourses,
      systemHealth: 'good'
    };

    console.log('✅ Admin stats loaded successfully');

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('💥 Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load admin statistics: ' + error.message
    });
  }
};

module.exports = {
  getFacultyStats,
  getStudentStats,
  getTAStats,
  getAdminStats
};