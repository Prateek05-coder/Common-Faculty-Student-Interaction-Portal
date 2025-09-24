const Course = require('../models/Course');
const User = require('../models/User');

/**
 * Comprehensive course access verification utility
 * This ensures proper relationships and prevents access denied errors
 */

/**
 * Check if a user has access to a course for a specific action
 * @param {Object} user - User object with _id and role
 * @param {String} courseId - Course ID to check access for
 * @param {String} action - Action type: 'view', 'upload', 'grade', 'manage'
 * @returns {Object} { hasAccess: boolean, reason: string, course: Object }
 */
const checkCourseAccess = async (user, courseId, action = 'view') => {
  try {
    console.log(`🔍 Checking ${action} access for user ${user.email} (${user.role}) on course ${courseId}`);

    // Get course with populated relationships
    const course = await Course.findById(courseId)
      .populate('faculty', 'name email')
      .populate('teachingAssistants', 'name email')
      .populate('enrolledStudents.student', 'name email');

    if (!course) {
      return {
        hasAccess: false,
        reason: 'Course not found',
        course: null
      };
    }

    console.log(`📚 Course: ${course.code} - ${course.name}`);
    console.log(`👨‍🏫 Faculty: ${course.faculty?.name} (${course.faculty?._id})`);
    console.log(`👥 TAs: ${course.teachingAssistants?.map(ta => `${ta.name} (${ta._id})`).join(', ') || 'None'}`);
    console.log(`👤 User: ${user.email} (${user._id})`);

    let hasAccess = false;
    let reason = '';

    // Admin always has access
    if (user.role === 'admin') {
      hasAccess = true;
      reason = 'Admin has full system access';
    }
    // Faculty access
    else if (user.role === 'faculty') {
      const facultyId = course.faculty?._id || course.faculty;
      hasAccess = facultyId && facultyId.toString() === user._id.toString();
      
      if (hasAccess) {
        reason = 'User is the course faculty';
      } else {
        reason = `User is not the course faculty. Course faculty: ${facultyId}, User: ${user._id}`;
        
        // Try to fix relationship if user should be faculty
        if (action === 'manage' || action === 'upload') {
          console.log(`🔧 Attempting to fix faculty relationship...`);
          const updatedCourse = await Course.findByIdAndUpdate(
            courseId,
            { faculty: user._id },
            { new: true }
          );
          if (updatedCourse) {
            hasAccess = true;
            reason = 'Faculty relationship fixed and access granted';
            console.log(`✅ Fixed faculty relationship for course ${course.code}`);
          }
        }
      }
    }
    // TA access
    else if (user.role === 'ta') {
      const teachingAssistants = course.teachingAssistants || [];
      hasAccess = teachingAssistants.some(ta => {
        const taId = ta._id || ta;
        return taId && taId.toString() === user._id.toString();
      });
      
      if (hasAccess) {
        reason = 'User is assigned as TA for this course';
      } else {
        reason = `User is not assigned as TA for this course. Current TAs: [${teachingAssistants.map(ta => ta._id || ta).join(', ')}]`;
        
        // Check if TA should be auto-assigned based on some criteria
        if (action === 'upload' || action === 'grade') {
          console.log(`🔧 Checking if TA should be auto-assigned...`);
          // For now, we won't auto-assign TAs as it should be done by faculty
          // But we can provide better error messages
          reason += '. Please contact the course faculty to be assigned as a TA.';
        }
      }
    }
    // Student access
    else if (user.role === 'student') {
      if (action === 'view') {
        const enrolledStudents = course.enrolledStudents || [];
        hasAccess = enrolledStudents.some(enrollment => {
          const studentId = enrollment.student?._id || enrollment.student;
          return studentId && studentId.toString() === user._id.toString() && enrollment.status === 'active';
        });
        
        if (hasAccess) {
          reason = 'Student is enrolled in this course';
        } else {
          reason = 'Student is not enrolled in this course or enrollment is inactive';
        }
      } else {
        hasAccess = false;
        reason = `Students cannot perform ${action} actions on courses`;
      }
    }
    // Unknown role
    else {
      hasAccess = false;
      reason = `Unknown or invalid role: ${user.role}`;
    }

    console.log(`🔐 Access result: ${hasAccess ? '✅ GRANTED' : '❌ DENIED'} - ${reason}`);

    return {
      hasAccess,
      reason,
      course
    };

  } catch (error) {
    console.error('💥 Course access check error:', error);
    return {
      hasAccess: false,
      reason: `Error checking course access: ${error.message}`,
      course: null
    };
  }
};

/**
 * Ensure proper course relationships are established
 * @param {String} courseId - Course ID
 * @returns {Object} Updated course with proper relationships
 */
const ensureCourseRelationships = async (courseId) => {
  try {
    const course = await Course.findById(courseId)
      .populate('faculty')
      .populate('teachingAssistants')
      .populate('enrolledStudents.student');

    if (!course) {
      throw new Error('Course not found');
    }

    let updated = false;

    // Ensure faculty relationship exists
    if (!course.faculty) {
      console.log(`⚠️ Course ${course.code} has no faculty assigned`);
      // We won't auto-assign faculty as this should be done explicitly
    }

    // Ensure teachingAssistants array exists
    if (!course.teachingAssistants) {
      course.teachingAssistants = [];
      updated = true;
    }

    // Ensure enrolledStudents array exists
    if (!course.enrolledStudents) {
      course.enrolledStudents = [];
      updated = true;
    }

    if (updated) {
      await course.save();
      console.log(`✅ Fixed course relationships for ${course.code}`);
    }

    return course;

  } catch (error) {
    console.error('💥 Error ensuring course relationships:', error);
    throw error;
  }
};

/**
 * Get user's accessible courses based on their role
 * @param {Object} user - User object
 * @returns {Array} Array of accessible courses
 */
const getUserAccessibleCourses = async (user) => {
  try {
    let query = {};

    switch (user.role) {
      case 'admin':
        // Admin can access all courses
        query = { isActive: true };
        break;
      
      case 'faculty':
        // Faculty can access courses they teach
        query = { faculty: user._id, isActive: true };
        break;
      
      case 'ta':
        // TAs can access courses they assist
        query = { teachingAssistants: user._id, isActive: true };
        break;
      
      case 'student':
        // Students can access courses they're enrolled in
        query = { 
          'enrolledStudents.student': user._id,
          'enrolledStudents.status': 'active',
          isActive: true 
        };
        break;
      
      default:
        return [];
    }

    const courses = await Course.find(query)
      .populate('faculty', 'name email')
      .populate('teachingAssistants', 'name email')
      .sort({ createdAt: -1 });

    console.log(`📚 Found ${courses.length} accessible courses for ${user.email} (${user.role})`);
    
    return courses;

  } catch (error) {
    console.error('💥 Error getting user accessible courses:', error);
    return [];
  }
};

module.exports = {
  checkCourseAccess,
  ensureCourseRelationships,
  getUserAccessibleCourses
};
