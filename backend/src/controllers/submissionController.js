const Assignment = require('../models/Assignment');
const Course = require('../models/Course');

// @route   GET /api/assignments/submissions
// @desc    Get assignment submissions with filtering
// @access  Private (Faculty and TA only)
const getSubmissions = async (req, res) => {
  try {
    console.log('📝 Getting submissions for:', req.user.email);
    
    const user = req.user;
    const { status, limit = 10, course, assignmentId } = req.query;

    // Only faculty and TAs can view submissions
    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and TAs can view submissions'
      });
    }

    // Get courses the user has access to
    let accessibleCourses = [];
    if (user.role === 'faculty') {
      accessibleCourses = await Course.find({ faculty: user._id, isActive: true });
    } else if (user.role === 'ta') {
      accessibleCourses = await Course.find({ teachingAssistants: user._id, isActive: true });
    } else if (user.role === 'admin') {
      accessibleCourses = await Course.find({ isActive: true });
    }

    const accessibleCourseIds = accessibleCourses.map(c => c._id);

    // Build query for assignments
    let assignmentQuery = {
      course: { $in: accessibleCourseIds },
      isActive: true
    };

    if (course) {
      assignmentQuery.course = course;
    }

    if (assignmentId) {
      assignmentQuery._id = assignmentId;
    }

    // Get assignments with submissions
    const assignments = await Assignment.find(assignmentQuery)
      .populate('course', 'name code')
      .populate('instructor', 'name email')
      .populate('submissions.student', 'name email studentId')
      .populate('submissions.gradedBy', 'name email')
      .sort({ dueDate: -1 })
      .lean();

    // Extract and filter submissions
    let allSubmissions = [];
    
    assignments.forEach(assignment => {
      if (assignment.submissions && assignment.submissions.length > 0) {
        assignment.submissions.forEach(submission => {
          // Filter by status if specified
          let includeSubmission = true;
          
          if (status === 'pending') {
            includeSubmission = !submission.isGraded;
          } else if (status === 'graded') {
            includeSubmission = submission.isGraded;
          } else if (status === 'late') {
            includeSubmission = submission.status === 'late';
          }
          
          if (includeSubmission) {
            allSubmissions.push({
              _id: submission._id,
              assignmentId: assignment._id,
              assignmentTitle: assignment.title,
              course: assignment.course,
              student: submission.student,
              submittedAt: submission.submittedAt,
              isGraded: submission.isGraded,
              grade: submission.grade,
              maxPoints: assignment.maxPoints,
              feedback: submission.feedback,
              status: submission.status,
              gradedBy: submission.gradedBy,
              gradedAt: submission.gradedAt,
              files: submission.files || [],
              textSubmission: submission.textSubmission || ''
            });
          }
        });
      }
    });

    // Sort by submission date (newest first)
    allSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Apply limit
    const limitedSubmissions = allSubmissions.slice(0, parseInt(limit));

    console.log(`✅ Found ${limitedSubmissions.length} submissions (${status || 'all'} status)`);

    res.status(200).json({
      success: true,
      data: limitedSubmissions,
      count: limitedSubmissions.length,
      total: allSubmissions.length
    });

  } catch (error) {
    console.error('💥 Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load submissions: ' + error.message
    });
  }
};

// @route   GET /api/assignments/pending-grading
// @desc    Get assignments with pending grading
// @access  Private (Faculty and TA only)
const getPendingGrading = async (req, res) => {
  try {
    console.log('⏳ Getting pending grading for:', req.user.email);
    
    const user = req.user;
    const { limit = 20, course } = req.query;

    // Only faculty and TAs can view pending grading
    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get accessible courses
    let accessibleCourses = [];
    if (user.role === 'faculty') {
      accessibleCourses = await Course.find({ faculty: user._id, isActive: true });
    } else if (user.role === 'ta') {
      accessibleCourses = await Course.find({ teachingAssistants: user._id, isActive: true });
    } else if (user.role === 'admin') {
      accessibleCourses = await Course.find({ isActive: true });
    }

    const accessibleCourseIds = accessibleCourses.map(c => c._id);

    // Build query
    let query = {
      course: { $in: accessibleCourseIds },
      isActive: true,
      isPublished: true
    };

    if (course) {
      query.course = course;
    }

    // Get assignments with ungraded submissions
    const assignments = await Assignment.find(query)
      .populate('course', 'name code')
      .populate('submissions.student', 'name email studentId')
      .sort({ dueDate: 1 })
      .lean();

    // Filter assignments that have pending submissions
    const pendingItems = [];
    
    assignments.forEach(assignment => {
      if (assignment.submissions && assignment.submissions.length > 0) {
        const ungradedSubmissions = assignment.submissions.filter(s => !s.isGraded);
        
        if (ungradedSubmissions.length > 0) {
          pendingItems.push({
            _id: assignment._id,
            title: assignment.title,
            course: assignment.course,
            dueDate: assignment.dueDate,
            maxPoints: assignment.maxPoints,
            totalSubmissions: assignment.submissions.length,
            ungradedCount: ungradedSubmissions.length,
            ungradedSubmissions: ungradedSubmissions.map(sub => ({
              _id: sub._id,
              student: sub.student,
              submittedAt: sub.submittedAt,
              status: sub.status
            }))
          });
        }
      }
    });

    // Sort by due date (oldest first for priority)
    pendingItems.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Apply limit
    const limitedItems = pendingItems.slice(0, parseInt(limit));

    console.log(`✅ Found ${limitedItems.length} assignments with pending grading`);

    res.status(200).json({
      success: true,
      data: limitedItems,
      count: limitedItems.length,
      total: pendingItems.length
    });

  } catch (error) {
    console.error('💥 Get pending grading error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load pending grading: ' + error.message
    });
  }
};

module.exports = {
  getSubmissions,
  getPendingGrading
};