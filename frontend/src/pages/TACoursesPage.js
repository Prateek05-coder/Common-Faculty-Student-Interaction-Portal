import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const TACoursesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStats, setCourseStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);

  useEffect(() => {
    loadTACourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseDetails(selectedCourse._id);
    }
  }, [selectedCourse]);

  const loadTACourses = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/courses/assisting`);
      setCourses(response.data.data || []);
      if (response.data.data && response.data.data.length > 0) {
        setSelectedCourse(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error loading TA courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadCourseDetails = async (courseId) => {
    try {
      const [statsRes, activityRes, tasksRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/courses/${courseId}/ta-stats`),
        axios.get(`${process.env.REACT_APP_API_URL}/courses/${courseId}/recent-activity?limit=10`),
        axios.get(`${process.env.REACT_APP_API_URL}/courses/${courseId}/pending-tasks`)
      ]);

      setCourseStats(statsRes.data.data || {});
      setRecentActivity(activityRes.data.data || []);
      setPendingTasks(tasksRes.data.data || []);
    } catch (error) {
      console.error('Error loading course details:', error);
      toast.error('Failed to load course details');
    }
  };

  const handleGradeAssignment = (assignmentId) => {
    navigate(`/grading?assignment=${assignmentId}&course=${selectedCourse._id}`);
  };

  const handleViewStudents = (courseId) => {
    navigate(`/courses/${courseId}/students`);
  };

  const handleHelpStudent = (studentId, issue) => {
    navigate(`/chat?user=${studentId}&context=${issue}`);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'assignment_submitted': return 'fas fa-upload';
      case 'question_posted': return 'fas fa-question-circle';
      case 'grade_requested': return 'fas fa-star';
      case 'help_needed': return 'fas fa-hand-paper';
      default: return 'fas fa-info-circle';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'assignment_submitted': return 'activity-info';
      case 'question_posted': return 'activity-warning';
      case 'grade_requested': return 'activity-primary';
      case 'help_needed': return 'activity-danger';
      default: return 'activity-default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-default';
    }
  };

  if (!['ta'].includes(user?.role)) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-lock"></i>
          <h2>Access Denied</h2>
          <p>This page is only available to Teaching Assistants.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ta-courses-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ta-courses-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>My TA Courses</h1>
            <p>Manage and assist in your assigned courses</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{courses.length}</span>
              <span className="stat-label">Courses</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">
                {courses.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0)}
              </span>
              <span className="stat-label">Students</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{pendingTasks.length}</span>
              <span className="stat-label">Pending Tasks</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ta-courses-content">
        {courses.length > 0 ? (
          <div className="courses-layout">
            {/* Course Selection Sidebar */}
            <div className="courses-sidebar">
              <h3>Your Courses</h3>
              <div className="courses-list">
                {courses.map(course => (
                  <div 
                    key={course._id} 
                    className={`course-item ${selectedCourse?._id === course._id ? 'active' : ''}`}
                    onClick={() => setSelectedCourse(course)}
                  >
                    <div className="course-header">
                      <h4>{course.code}</h4>
                      <span className="student-count">
                        {course.enrolledStudents?.length || 0} students
                      </span>
                    </div>
                    <div className="course-title">{course.name}</div>
                    <div className="course-faculty">
                      <i className="fas fa-chalkboard-teacher"></i>
                      {course.faculty?.name}
                    </div>
                    <div className="course-semester">
                      {course.semester} {course.year}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Course Details */}
            {selectedCourse && (
              <div className="course-details">
                <div className="course-overview">
                  <div className="overview-header">
                    <h2>{selectedCourse.code} - {selectedCourse.name}</h2>
                    <div className="course-actions">
                      <button 
                        className="btn btn-outline"
                        onClick={() => handleViewStudents(selectedCourse._id)}
                      >
                        <i className="fas fa-users"></i>
                        View Students
                      </button>
                      <button 
                        className="btn btn-primary"
                        onClick={() => navigate(`/courses/${selectedCourse._id}`)}
                      >
                        <i className="fas fa-external-link-alt"></i>
                        Course Details
                      </button>
                    </div>
                  </div>

                  {/* Course Statistics */}
                  <div className="course-stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-users"></i>
                      </div>
                      <div className="stat-info">
                        <h3>{courseStats.totalStudents || 0}</h3>
                        <p>Total Students</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-tasks"></i>
                      </div>
                      <div className="stat-info">
                        <h3>{courseStats.totalAssignments || 0}</h3>
                        <p>Assignments</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-clipboard-check"></i>
                      </div>
                      <div className="stat-info">
                        <h3>{courseStats.pendingGrading || 0}</h3>
                        <p>Need Grading</p>
                      </div>
                    </div>

                    <div className="stat-card">
                      <div className="stat-icon">
                        <i className="fas fa-question-circle"></i>
                      </div>
                      <div className="stat-info">
                        <h3>{courseStats.openQuestions || 0}</h3>
                        <p>Open Questions</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pending Tasks */}
                <div className="pending-tasks-section">
                  <h3>Pending Tasks</h3>
                  {pendingTasks.length > 0 ? (
                    <div className="tasks-list">
                      {pendingTasks.map(task => (
                        <div key={task._id} className={`task-item ${getPriorityColor(task.priority)}`}>
                          <div className="task-info">
                            <div className="task-header">
                              <h4>{task.title}</h4>
                              <span className={`priority-badge ${task.priority}`}>
                                {task.priority}
                              </span>
                            </div>
                            <p className="task-description">{task.description}</p>
                            <div className="task-meta">
                              <span className="task-type">
                                <i className={getActivityIcon(task.type)}></i>
                                {task.type.replace('_', ' ')}
                              </span>
                              <span className="task-due">
                                <i className="fas fa-clock"></i>
                                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                              </span>
                            </div>
                          </div>
                          <div className="task-actions">
                            {task.type === 'assignment_grading' && (
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleGradeAssignment(task.assignmentId)}
                              >
                                Grade Now
                              </button>
                            )}
                            {task.type === 'student_help' && (
                              <button 
                                className="btn btn-sm btn-info"
                                onClick={() => handleHelpStudent(task.studentId, task.issue)}
                              >
                                Help Student
                              </button>
                            )}
                            {task.type === 'forum_question' && (
                              <button 
                                className="btn btn-sm btn-warning"
                                onClick={() => navigate(`/forums/${task.forumId}`)}
                              >
                                Answer Question
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-check-circle"></i>
                      <h4>All Caught Up!</h4>
                      <p>No pending tasks for this course.</p>
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="recent-activity-section">
                  <h3>Recent Activity</h3>
                  {recentActivity.length > 0 ? (
                    <div className="activity-timeline">
                      {recentActivity.map(activity => (
                        <div key={activity._id} className={`activity-item ${getActivityColor(activity.type)}`}>
                          <div className="activity-icon">
                            <i className={getActivityIcon(activity.type)}></i>
                          </div>
                          <div className="activity-content">
                            <div className="activity-header">
                              <span className="activity-title">{activity.title}</span>
                              <span className="activity-time">
                                {new Date(activity.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="activity-description">{activity.description}</p>
                            {activity.student && (
                              <div className="activity-student">
                                <i className="fas fa-user"></i>
                                {activity.student.name}
                              </div>
                            )}
                          </div>
                          {activity.actionRequired && (
                            <div className="activity-action">
                              <button 
                                className="btn btn-sm btn-outline"
                                onClick={() => {
                                  if (activity.type === 'assignment_submitted') {
                                    handleGradeAssignment(activity.assignmentId);
                                  } else if (activity.type === 'question_posted') {
                                    navigate(`/forums/${activity.forumId}`);
                                  }
                                }}
                              >
                                Take Action
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <i className="fas fa-history"></i>
                      <h4>No Recent Activity</h4>
                      <p>No recent activity in this course.</p>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="quick-actions-section">
                  <h3>Quick Actions</h3>
                  <div className="actions-grid">
                    <button 
                      className="action-card"
                      onClick={() => navigate(`/grading?course=${selectedCourse._id}`)}
                    >
                      <div className="action-icon">
                        <i className="fas fa-clipboard-check"></i>
                      </div>
                      <div className="action-info">
                        <h4>Grade Assignments</h4>
                        <p>Review and grade student submissions</p>
                      </div>
                    </button>

                    <button 
                      className="action-card"
                      onClick={() => navigate(`/forums?course=${selectedCourse._id}`)}
                    >
                      <div className="action-icon">
                        <i className="fas fa-comments"></i>
                      </div>
                      <div className="action-info">
                        <h4>Answer Questions</h4>
                        <p>Help students in course forums</p>
                      </div>
                    </button>

                    <button 
                      className="action-card"
                      onClick={() => navigate(`/video-lectures?course=${selectedCourse._id}`)}
                    >
                      <div className="action-icon">
                        <i className="fas fa-video"></i>
                      </div>
                      <div className="action-info">
                        <h4>Manage Videos</h4>
                        <p>Upload and organize course videos</p>
                      </div>
                    </button>

                    <button 
                      className="action-card"
                      onClick={() => navigate(`/analytics?course=${selectedCourse._id}`)}
                    >
                      <div className="action-icon">
                        <i className="fas fa-chart-bar"></i>
                      </div>
                      <div className="action-info">
                        <h4>View Analytics</h4>
                        <p>Monitor student progress and engagement</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <i className="fas fa-chalkboard"></i>
            <h3>No Courses Assigned</h3>
            <p>You are not currently assigned as a TA for any courses.</p>
            <p>Contact your faculty coordinator or administrator for course assignments.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TACoursesPage;
