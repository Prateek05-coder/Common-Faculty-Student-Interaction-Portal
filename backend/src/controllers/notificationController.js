const Notification = require('../models/Notification');
const User = require('../models/User');
const Course = require('../models/Course');

// Helper function to create notification
const createNotification = async (data) => {
  try {
    return await Notification.createNotification(data);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Helper function to create bulk notifications
const createBulkNotifications = async (recipients, notificationData) => {
  try {
    const notifications = recipients.map(recipientId => ({
      ...notificationData,
      recipient: recipientId
    }));
    
    return await Notification.createBulkNotifications(notifications);
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
  }
};

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const user = req.user;

    let query = { 
      recipient: user._id, 
      isActive: true 
    };

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar role')
      .populate('metadata.courseId', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      recipient: user._id,
      isRead: false,
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        },
        unreadCount
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const notification = await Notification.findOne({
      _id: id,
      recipient: user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const user = req.user;

    await Notification.updateMany(
      { recipient: user._id, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read'
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: user._id },
      { isActive: false }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification'
    });
  }
};

const notifyAssignmentCreated = async (assignment, course) => {
  try {
    const students = course.enrolledStudents;
    
    await createBulkNotifications(students, {
      sender: assignment.faculty,
      type: 'assignment_created',
      title: 'New Assignment Created',
      message: `New assignment "${assignment.title}" has been created for ${course.name}`,
      metadata: {
        courseId: course._id,
        assignmentId: assignment._id
      },
      priority: 'high',
      actionUrl: `/assignments/${assignment._id}`
    });

  } catch (error) {
    console.error('Error notifying assignment created:', error);
  }
};

// When assignment is submitted
const notifyAssignmentSubmitted = async (submission, assignment, student) => {
  try {
    await createNotification({
      recipient: assignment.faculty,
      sender: student._id,
      type: 'assignment_submitted',
      title: 'Assignment Submitted',
      message: `${student.name} has submitted assignment "${assignment.title}"`,
      metadata: {
        assignmentId: assignment._id,
        courseId: assignment.course
      },
      priority: 'medium',
      actionUrl: `/assignments/${assignment._id}/submissions`
    });

  } catch (error) {
    console.error('Error notifying assignment submitted:', error);
  }
};

// When assignment is graded
const notifyAssignmentGraded = async (submission, assignment, grader) => {
  try {
    await createNotification({
      recipient: submission.student,
      sender: grader._id,
      type: 'assignment_graded',
      title: 'Assignment Graded',
      message: `Your assignment "${assignment.title}" has been graded. Grade: ${submission.grade}/${assignment.maxPoints}`,
      metadata: {
        assignmentId: assignment._id,
        courseId: assignment.course
      },
      priority: 'high',
      actionUrl: `/assignments/${assignment._id}`
    });

  } catch (error) {
    console.error('Error notifying assignment graded:', error);
  }
};

// When forum is created
const notifyForumCreated = async (forum, course) => {
  try {
    // Notify all faculty and TAs for the course
    const faculty = await User.find({
      $or: [
        { role: 'faculty', teachingCourses: course._id },
        { role: 'ta', assistingCourses: course._id }
      ]
    });

    const recipients = faculty.map(f => f._id);

    if (recipients.length > 0) {
      await createBulkNotifications(recipients, {
        sender: forum.author,
        type: 'forum_created',
        title: 'New Forum Discussion',
        message: `New discussion "${forum.title}" created in ${course.name}`,
        metadata: {
          courseId: course._id,
          forumId: forum._id
        },
        priority: 'medium',
        actionUrl: `/forums/${forum._id}`
      });
    }

  } catch (error) {
    console.error('Error notifying forum created:', error);
  }
};

// When forum reply is posted
const notifyForumReply = async (forum, post, replier, course) => {
  try {
    // Notify forum author if they're not the one replying
    if (forum.author.toString() !== replier._id.toString()) {
      await createNotification({
        recipient: forum.author,
        sender: replier._id,
        type: 'forum_reply',
        title: 'Forum Reply',
        message: `${replier.name} replied to your discussion "${forum.title}"`,
        metadata: {
          courseId: course._id,
          forumId: forum._id
        },
        priority: 'medium',
        actionUrl: `/forums/${forum._id}`
      });
    }

    // Notify all previous participants in the discussion
    const participants = [...new Set(
      forum.posts
        .map(p => p.author.toString())
        .filter(authorId => 
          authorId !== replier._id.toString() && 
          authorId !== forum.author.toString()
        )
    )];

    if (participants.length > 0) {
      await createBulkNotifications(participants, {
        sender: replier._id,
        type: 'forum_reply',
        title: 'Forum Update',
        message: `${replier.name} replied in discussion "${forum.title}"`,
        metadata: {
          courseId: course._id,
          forumId: forum._id
        },
        priority: 'low',
        actionUrl: `/forums/${forum._id}`
      });
    }

  } catch (error) {
    console.error('Error notifying forum reply:', error);
  }
};

// When task is assigned to TA
const notifyTaskAssigned = async (task, ta, faculty) => {
  try {
    await createNotification({
      recipient: ta._id,
      sender: faculty._id,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `You have been assigned a new task: "${task.title}"`,
      metadata: {
        taskId: task._id,
        courseId: task.course
      },
      priority: 'high',
      actionUrl: `/tasks/${task._id}`
    });

  } catch (error) {
    console.error('Error notifying task assigned:', error);
  }
};

// When video lecture is uploaded
const notifyVideoUploaded = async (video, course, uploader) => {
  try {
    const students = course.enrolledStudents;

    await createBulkNotifications(students, {
      sender: uploader._id,
      type: 'video_uploaded',
      title: 'New Video Lecture',
      message: `New video lecture "${video.title}" has been uploaded for ${course.name}`,
      metadata: {
        courseId: course._id,
        videoId: video._id
      },
      priority: 'medium',
      actionUrl: `/courses/${course._id}/videos/${video._id}`
    });

  } catch (error) {
    console.error('Error notifying video uploaded:', error);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markNotificationsAsRead: markAsRead,
  markAllAsRead,
  deleteNotification,
  // Notification trigger functions
  notifyAssignmentCreated,
  notifyAssignmentSubmitted,
  notifyAssignmentGraded,
  notifyForumCreated,
  notifyForumReply,
  notifyTaskAssigned,
  notifyVideoUploaded
};