const Assignment = require('../models/Assignment');
const Course = require('../models/Course');
const User = require('../models/User');

// @route   GET /api/calendar/events
// @desc    Get calendar events based on user's role and courses
// @access  Private
const getCalendarEvents = async (req, res) => {
  try {
    const user = req.user;
    const { start, end, view } = req.query;
    
    // Parse dates
    const startDate = new Date(start);
    const endDate = new Date(end);
    
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

    const events = [];

    // Get assignments as calendar events
    const assignments = await Assignment.find({
      course: { $in: accessibleCourses },
      status: 'published',
      isActive: true,
      dueDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .populate('course', 'name code')
    .populate('faculty', 'name');

    // Convert assignments to calendar events
    assignments.forEach(assignment => {
      const dueDate = new Date(assignment.dueDate);
      
      // Determine if assignment is submitted (for students)
      let isSubmitted = false;
      if (user.role === 'student') {
        isSubmitted = (assignment.submissions || []).some(sub => 
          sub.student.toString() === user._id.toString()
        );
      }

      events.push({
        id: `assignment_${assignment._id}`,
        title: assignment.title,
        description: assignment.description,
        date: dueDate.toISOString(),
        dueDate: dueDate.toISOString(),
        type: 'assignment',
        course: assignment.course,
        instructor: assignment.faculty,
        assignmentId: assignment._id,
        maxPoints: assignment.maxPoints,
        isSubmitted,
        priority: getDaysUntilDue(dueDate) <= 2 ? 'urgent' : 
                 getDaysUntilDue(dueDate) <= 7 ? 'warning' : 'normal'
      });
    });

    // Get course schedules as recurring events
    const courses = await Course.find({
      _id: { $in: accessibleCourses },
      isActive: true
    }).populate('faculty', 'name');

    courses.forEach(course => {
      if (course.schedule && course.schedule.length > 0) {
        // Parse schedule and create recurring events
        const scheduleEvents = generateScheduleEvents(course, startDate, endDate);
        events.push(...scheduleEvents);
      }
    });

    // Add exam events (if stored separately)
    // Add office hours events
    // Add other course-related events

    // Sort events by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Get calendar events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching calendar events'
    });
  }
};

// @route   POST /api/calendar/events
// @desc    Create custom calendar event
// @access  Private
const createCalendarEvent = async (req, res) => {
  try {
    const user = req.user;
    const {
      title,
      description,
      startTime,
      endTime,
      type,
      courseId,
      isRecurring,
      recurrencePattern
    } = req.body;

    // Validate permissions
    if (!['faculty', 'ta', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty, TA, or Admin role required.'
      });
    }

    // Create event logic here
    // This would typically be stored in a separate Events model
    
    res.status(201).json({
      success: true,
      message: 'Event created successfully'
    });

  } catch (error) {
    console.error('Create calendar event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating calendar event'
    });
  }
};

// Helper function to calculate days until due date
const getDaysUntilDue = (dueDate) => {
  const now = new Date();
  const timeDiff = dueDate.getTime() - now.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

// Helper function to generate recurring schedule events
const generateScheduleEvents = (course, startDate, endDate) => {
  const events = [];
  
  // This is a simplified implementation
  // In a real application, you'd parse the course schedule format
  // and generate appropriate recurring events
  
  if (!course.schedule || !course.classTime) {
    return events;
  }

  // Example: Parse "MWF 10:00-11:30" format
  const schedule = course.schedule;
  const classTime = course.classTime || '10:00-11:30';
  
  // Simple weekly recurring logic
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isClassDay(currentDate, schedule)) {
      const [startTime, endTime] = parseClassTime(classTime, currentDate);
      
      events.push({
        id: `class_${course._id}_${currentDate.toDateString()}`,
        title: `${course.name} - Lecture`,
        description: course.description || '',
        date: currentDate.toISOString(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        type: 'class',
        course: {
          _id: course._id,
          name: course.name,
          code: course.code
        },
        instructor: course.faculty,
        location: course.location || 'TBA',
        priority: 'normal'
      });
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return events;
};

// Helper function to check if a date matches the class schedule
const isClassDay = (date, schedule) => {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Simple mapping for common schedule formats
  const scheduleMap = {
    'M': [1], // Monday
    'T': [2], // Tuesday  
    'W': [3], // Wednesday
    'R': [4], // Thursday
    'F': [5], // Friday
    'MW': [1, 3],
    'MWF': [1, 3, 5],
    'TR': [2, 4],
    'TTH': [2, 4]
  };
  
  const scheduleDays = scheduleMap[schedule] || [];
  return scheduleDays.includes(dayOfWeek);
};

// Helper function to parse class time
const parseClassTime = (classTime, date) => {
  const [startTimeStr, endTimeStr] = classTime.split('-');
  
  const startTime = new Date(date);
  const endTime = new Date(date);
  
  // Parse start time
  const [startHour, startMin] = startTimeStr.split(':');
  startTime.setHours(parseInt(startHour), parseInt(startMin) || 0, 0, 0);
  
  // Parse end time
  const [endHour, endMin] = endTimeStr.split(':');
  endTime.setHours(parseInt(endHour), parseInt(endMin) || 0, 0, 0);
  
  return [startTime, endTime];
};

module.exports = {
  getCalendarEvents,
  createCalendarEvent
};