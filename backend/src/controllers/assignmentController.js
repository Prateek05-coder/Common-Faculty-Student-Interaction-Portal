const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for assignment files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/assignments/';
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'assignment-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|jpg|jpeg|png|ppt|pptx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// @route   POST /api/assignments
// @desc    Create new assignment (Faculty and TA only)
// @access  Private
const createAssignment = async (req, res) => {
  try {
    console.log('📝 Create assignment request received:', req.body);
    console.log('👤 User role:', req.user.role);
    
    const user = req.user;
    
    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and TAs can create assignments'
      });
    }

    const {
      title,
      description,
      course,
      maxPoints,
      dueDate,
      availableFrom,
      instructions,
      allowedFileTypes,
      maxFileSize,
      submissionType,
      isPublished
    } = req.body;

    // Validate required fields
    if (!title || title.trim() === '') {
      console.log('❌ Missing title');
      return res.status(400).json({
        success: false,
        message: 'Assignment title is required'
      });
    }

    if (!course) {
      console.log('❌ Missing course');
      return res.status(400).json({
        success: false,
        message: 'Course selection is required'
      });
    }

    if (!maxPoints || isNaN(maxPoints)) {
      console.log('❌ Missing or invalid maxPoints');
      return res.status(400).json({
        success: false,
        message: 'Maximum points must be a valid number'
      });
    }

    if (!dueDate) {
      console.log('❌ Missing dueDate');
      return res.status(400).json({
        success: false,
        message: 'Due date is required'
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

    // Check if user can create assignments for this course
    const canAccess = courseObj.faculty.toString() === user._id.toString() || 
                     (courseObj.teachingAssistants || []).includes(user._id) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this course'
      });
    }

    // Create assignment
    const assignmentData = {
      title: title.trim(),
      description: description ? description.trim() : 'No description provided',
      course: course,
      instructor: user._id,
      maxPoints: parseInt(maxPoints),
      dueDate: new Date(dueDate),
      availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
      instructions: instructions || '',
      allowedFileTypes: allowedFileTypes || ['pdf', 'doc', 'docx', 'txt'],
      maxFileSize: maxFileSize ? parseInt(maxFileSize) : 10485760,
      submissionType: submissionType || 'both',
      isPublished: isPublished !== undefined ? isPublished : true,
      submissions: [],
      isActive: true
    };

    console.log('📝 Creating assignment with data:', assignmentData);

    const assignment = new Assignment(assignmentData);
    const savedAssignment = await assignment.save();

    console.log('✅ Assignment saved successfully:', savedAssignment._id);

    // Populate the created assignment
    const populatedAssignment = await Assignment.findById(savedAssignment._id)
      .populate('course', 'name code')
      .populate('instructor', 'name email');

    console.log('🎉 Assignment created successfully:', populatedAssignment.title);

    // Notify enrolled students about new assignment
    try {
      const courseWithStudents = await Course.findById(course).populate('enrolledStudents.student');
      if (courseWithStudents && courseWithStudents.enrolledStudents.length > 0) {
        const notifications = courseWithStudents.enrolledStudents
          .filter(enrollment => enrollment.status === 'active')
          .map(enrollment => ({
            recipient: enrollment.student._id,
            sender: user._id,
            type: 'assignment_created',
            title: 'New Assignment Created',
            message: `New assignment "${populatedAssignment.title}" has been created in ${courseWithStudents.name}`,
            relatedId: populatedAssignment._id,
            relatedModel: 'Assignment',
            isRead: false
          }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
          console.log(`📢 Sent ${notifications.length} notifications for new assignment`);
        }
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send notifications:', notificationError);
      // Don't fail the assignment creation if notifications fail
    }

    res.status(201).json({
      success: true,
      data: populatedAssignment,
      message: 'Assignment created successfully'
    });

  } catch (error) {
    console.error('💥 Create assignment error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error: ' + errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create assignment: ' + error.message
    });
  }
};

// @route   GET /api/assignments
// @desc    Get assignments based on user role and course
// @access  Private
const getAssignments = async (req, res) => {
  try {
    const user = req.user;
    const { course, status } = req.query;
    
    let query = { isActive: true };
    
    // Course filter
    if (course) {
      query.course = course;
    }

    let assignments;

    switch (user.role) {
      case 'faculty':
        // Get assignments from courses taught by faculty
        const facultyCourses = await Course.find({ faculty: user._id, isActive: true });
        const facultyCourseIds = facultyCourses.map(course => course._id);
        
        query.course = { $in: facultyCourseIds };
        assignments = await Assignment.find(query)
          .populate('course', 'name code')
          .populate('instructor', 'name email')
          .populate('submissions.student', 'name email studentId')
          .sort({ dueDate: -1 });
        break;
        
      case 'ta':
        // Get assignments from courses where user is TA
        const taCourses = await Course.find({ teachingAssistants: user._id, isActive: true });
        const taCourseIds = taCourses.map(course => course._id);
        
        query.course = { $in: taCourseIds };
        assignments = await Assignment.find(query)
          .populate('course', 'name code')
          .populate('instructor', 'name email')
          .populate('submissions.student', 'name email studentId')
          .sort({ dueDate: -1 });
        break;
        
      case 'student':
        // Get assignments from enrolled courses
        const studentCourses = await Course.find({ 
          'enrolledStudents.student': user._id,
          'enrolledStudents.status': 'active',
          isActive: true 
        });
        const studentCourseIds = studentCourses.map(course => course._id);
        
        query.course = { $in: studentCourseIds };
        query.isPublished = true;
        
        assignments = await Assignment.find(query)
          .populate('course', 'name code')
          .populate('instructor', 'name email')
          .sort({ dueDate: 1 });
        
        // Add submission status for each assignment
        assignments = assignments.map(assignment => {
          const assignmentObj = assignment.toObject();
          const userSubmission = assignment.getStudentSubmission(user._id);
          assignmentObj.userSubmission = userSubmission;
          assignmentObj.canSubmit = assignment.canStudentSubmit(user._id);
          return assignmentObj;
        });
        break;
        
      case 'admin':
        assignments = await Assignment.find(query)
          .populate('course', 'name code')
          .populate('instructor', 'name email')
          .sort({ dueDate: -1 });
        break;
        
      default:
        return res.status(403).json({
          success: false,
          message: 'Invalid user role'
        });
    }

    res.status(200).json({
      success: true,
      data: assignments,
      count: assignments.length
    });

  } catch (error) {
    console.error('💥 Get assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments'
    });
  }
};

// @route   GET /api/assignments/:id
// @desc    Get assignment by ID
// @access  Private
const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const assignment = await Assignment.findById(id)
      .populate('course', 'name code')
      .populate('instructor', 'name email')
      .populate('submissions.student', 'name email studentId')
      .populate('submissions.gradedBy', 'name email');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check access permissions
    const course = await Course.findById(assignment.course._id);
    const canAccess = course.faculty?.toString() === user._id.toString() || 
                     (course.teachingAssistants || []).includes(user._id) ||
                     (course.enrolledStudents || []).some(e => e.student.toString() === user._id.toString()) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assignment'
      });
    }

    // Students can only see published assignments
    if (user.role === 'student' && !assignment.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Assignment not yet available'
      });
    }

    // Add user-specific data for students
    if (user.role === 'student') {
      const assignmentObj = assignment.toObject();
      assignmentObj.userSubmission = assignment.getStudentSubmission(user._id);
      assignmentObj.canSubmit = assignment.canStudentSubmit(user._id);
      
      // Remove other students' submissions from view
      assignmentObj.submissions = assignmentObj.submissions.filter(
        sub => sub.student._id.toString() === user._id.toString()
      );
      
      return res.status(200).json({
        success: true,
        data: assignmentObj
      });
    }

    res.status(200).json({
      success: true,
      data: assignment
    });

  } catch (error) {
    console.error('💥 Get assignment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment'
    });
  }
};

// @route   POST /api/assignments/:id/submit
// @desc    Submit assignment (Student only)
// @access  Private
const submitAssignment = async (req, res) => {
  try {
    console.log('🚀 Assignment submission started');
    console.log('Assignment ID:', req.params.id);
    console.log('User:', req.user?.email, req.user?.role);
    console.log('Body:', req.body);
    console.log('Files:', req.files?.length || 0, 'files uploaded');
    
    const { id } = req.params;
    const user = req.user;
    const { textSubmission } = req.body;

    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit assignments'
      });
    }

    const assignment = await Assignment.findById(id).populate('course');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if student can submit
    if (!assignment.canStudentSubmit(user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Submission not allowed at this time'
      });
    }

    // Check if student is enrolled in the course
    const course = assignment.course;
    const isEnrolled = course.enrolledStudents.some(
      enrollment => enrollment.student.toString() === user._id.toString() && 
                   enrollment.status === 'active'
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Validate submission based on assignment type
    const hasTextSubmission = textSubmission && textSubmission.trim() !== '';
    const hasFileSubmission = req.files && req.files.length > 0;

    // Check submission requirements based on assignment type
    if (assignment.submissionType === 'text' && !hasTextSubmission) {
      return res.status(400).json({
        success: false,
        message: 'This assignment requires a text submission'
      });
    }

    if (assignment.submissionType === 'file' && !hasFileSubmission) {
      return res.status(400).json({
        success: false,
        message: 'This assignment requires file upload(s)'
      });
    }

    if (assignment.submissionType === 'both' && !hasTextSubmission && !hasFileSubmission) {
      return res.status(400).json({
        success: false,
        message: 'This assignment requires either text submission or file upload(s)'
      });
    }

    // Handle file submissions
    let files = [];
    if (req.files && req.files.length > 0) {
      files = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        fileUrl: `/uploads/assignments/${file.filename}`,
        fileSize: file.size
      }));
    }

    // Create new submission
    const newSubmission = {
      student: user._id,
      submittedAt: new Date(),
      files: files,
      textSubmission: textSubmission || '',
      status: 'submitted'
    };
    
    assignment.submissions.push(newSubmission);
    await assignment.save();

    console.log(`✅ Assignment submitted: ${assignment.title} by ${user.email}`);

    // Notify faculty and TAs about new submission
    try {
      const course = assignment.course;
      const recipients = [course.faculty];
      if (course.teachingAssistants && course.teachingAssistants.length > 0) {
        recipients.push(...course.teachingAssistants);
      }

      const notifications = recipients.map(recipientId => ({
        recipient: recipientId,
        sender: user._id,
        type: 'assignment_submitted',
        title: 'New Assignment Submission',
        message: `${user.name} has submitted assignment "${assignment.title}"`,
        relatedId: assignment._id,
        relatedModel: 'Assignment',
        isRead: false
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        console.log(`📢 Sent ${notifications.length} notifications for assignment submission`);
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send submission notifications:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Assignment submitted successfully'
    });

  } catch (error) {
    console.error('💥 Submit assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting assignment'
    });
  }
};

// @route   POST /api/assignments/:id/grade/:studentId
// @desc    Grade student submission (Faculty and TA only)
// @access  Private
const gradeSubmission = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const user = req.user;
    const { grade, feedback } = req.body;

    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty and TAs can grade assignments'
      });
    }

    const assignment = await Assignment.findById(id).populate('course');
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if user can access this course
    const course = assignment.course;
    const canAccess = course.faculty.toString() === user._id.toString() || 
                     course.teachingAssistants.includes(user._id) ||
                     user.role === 'admin';

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this course'
      });
    }

    // Find student submission
    const submission = assignment.getStudentSubmission(studentId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Student submission not found'
      });
    }

    // Validate grade
    if (grade < 0 || grade > assignment.maxPoints) {
      return res.status(400).json({
        success: false,
        message: `Grade must be between 0 and ${assignment.maxPoints}`
      });
    }

    // Update submission
    submission.grade = parseFloat(grade);
    submission.feedback = feedback || '';
    submission.isGraded = true;
    submission.gradedBy = user._id;
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await assignment.save();

    console.log(`✅ Assignment graded: ${assignment.title} for student ${studentId}`);

    // Notify student about grade
    try {
      const notification = new Notification({
        recipient: studentId,
        sender: user._id,
        type: 'assignment_graded',
        title: 'Assignment Graded',
        message: `Your assignment "${assignment.title}" has been graded. Score: ${grade}/${assignment.maxPoints}`,
        relatedId: assignment._id,
        relatedModel: 'Assignment',
        isRead: false
      });

      await notification.save();
      console.log(`📢 Sent grade notification to student ${studentId}`);
    } catch (notificationError) {
      console.error('⚠️ Failed to send grade notification:', notificationError);
    }

    res.status(200).json({
      success: true,
      message: 'Assignment graded successfully'
    });

  } catch (error) {
    console.error('💥 Grade assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error grading assignment'
    });
  }
};

// @route   GET /api/assignments/my-grades
// @desc    Get student's grades for all assignments
// @access  Private (Students only)
const getMyGrades = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their grades'
      });
    }

    // Get all assignments from courses the student is enrolled in
    const assignments = await Assignment.find({
      'submissions.student': user._id,
      'submissions.isGraded': true,
      isActive: true
    })
    .populate('course', 'name code semester year faculty')
    .populate('course.faculty', 'name')
    .populate('submissions.gradedBy', 'name')
    .sort({ 'submissions.gradedAt': -1 });

    // Extract graded submissions for this student
    const grades = [];
    assignments.forEach(assignment => {
      const submission = assignment.submissions.find(
        sub => sub.student.toString() === user._id.toString() && sub.isGraded
      );
      
      if (submission) {
        grades.push({
          _id: submission._id,
          assignment: {
            _id: assignment._id,
            title: assignment.title,
            maxPoints: assignment.maxPoints,
            dueDate: assignment.dueDate
          },
          course: assignment.course,
          score: submission.grade,
          percentage: ((submission.grade / assignment.maxPoints) * 100).toFixed(1),
          feedback: submission.feedback,
          gradedAt: submission.gradedAt,
          gradedBy: submission.gradedBy
        });
      }
    });

    res.status(200).json({
      success: true,
      data: grades
    });

  } catch (error) {
    console.error('💥 Get my grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching grades'
    });
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  submitAssignment,
  gradeSubmission,
  getMyGrades,
  upload
};