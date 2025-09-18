import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState();
  const [loading, setLoading] = useState(true);

  
  const loadStudentData = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/dashboard/student-stats`);
      console.log(response.data.data);
      setStats(response.data.data);
    } catch (error) {
      console.error('Error loading student data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadStudentData();
  }, []);
  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard-error">
        <h2>Unable to load dashboard</h2>
        <button onClick={loadStudentData} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }
  

  {stats && console.log(stats)};
  return (
    <div className="student-dashboard">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p>Here's what's happening with your courses today.</p>
        </div>
        <div className="quick-stats">
          <div className="stat-card">
            <i className="fas fa-book"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.enrolledCourses}</span>
              <span className="stat-label">Enrolled Courses</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-tasks"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.upcomingAssignments}</span>
              <span className="stat-label">Upcoming</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-check-circle"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.submittedAssignments}</span>
              <span className="stat-label">Submitted</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-percentage"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.averageGrade}%</span>
              <span className="stat-label">Avg Grade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        {/* Upcoming Deadlines */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-clock"></i>
              Upcoming Deadlines
            </h2>
            {/* {stats.upcomingDeadlines.length > 0 && (
              <button 
                className="btn btn-outline btn-sm"
                onClick={() => navigate('/calendar')}
              >
                View Calendar
              </button>
            )} */}
          </div>
          
          <div className="deadlines-list">
            {/* {stats.upcomingDeadlines.length > 0 ? (
              stats.upcomingDeadlines.map((assignment) => (
                <div 
                  key={assignment._id} 
                  className={`deadline-item ${assignment.daysLeft <= 2 ? 'urgent' : assignment.daysLeft <= 7 ? 'warning' : ''}`}
                  onClick={() => navigate(`/assignments/${assignment._id}`)}
                >
                  <div className="deadline-info">
                    <h4>{assignment.title}</h4>
                    <div className="assignment-meta">
                      <span className="course-name">
                        <i className="fas fa-book"></i>
                        {assignment.course?.name}
                      </span>
                      <span className="points">
                        <i className="fas fa-star"></i>
                        {assignment.maxPoints} points
                      </span>
                    </div>
                  </div>
                  <div className="deadline-countdown">
                    <div className="days-left">
                      {assignment.daysLeft}
                      <span>days</span>
                    </div>
                    <div className="due-date">
                      Due {new Date(assignment.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-calendar-check"></i>
                <h3>All caught up!</h3>
                <p>No upcoming assignment deadlines.</p>
              </div>
            )} */}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-chart-line"></i>
              Academic Progress
            </h2>
          </div>
          
          <div className="progress-cards">
            <div className="progress-card">
              <div className="progress-header">
                <h3>Assignment Completion</h3>
                <span className="progress-percentage">
                  {Math.round((stats.submittedAssignments / stats.totalAssignments) * 100) || 0}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${Math.round((stats.submittedAssignments / stats.totalAssignments) * 100) || 0}%` 
                  }}
                ></div>
              </div>
              <div className="progress-details">
                <span>{stats.submittedAssignments} of {stats.totalAssignments} completed</span>
              </div>
            </div>

            <div className="progress-card">
              <div className="progress-header">
                <h3>Overall Grade</h3>
                <span className="grade-display">{stats.averageGrade}%</span>
              </div>
              <div className="grade-distribution">
                {/* {Object.entries(stats.performance.gradeDistribution).map(([grade, count]) => (
                  <div key={grade} className="grade-bar">
                    <span className="grade-letter">{grade}</span>
                    <div className="grade-count">{count}</div>
                  </div>
                ))} */}
              </div>
            </div>
          </div>
        </div>

        {/* My Courses */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-graduation-cap"></i>
              My Courses
            </h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/courses')}
            >
              View All
            </button>
          </div>
          
          <div className="courses-grid">
            {stats.courses.map((course) => (
              <div 
                key={course._id} 
                className="course-card"
                onClick={() => navigate(`/courses/${course._id}`)}
              >
                <div className="course-header">
                  <div className="course-code">{course.code}</div>
                  <div className="course-semester">{course.semester} {course.year}</div>
                </div>
                <div className="course-content">
                  <h4>{course.name}</h4>
                  <p className="course-instructor">
                    <i className="fas fa-chalkboard-teacher"></i>
                    {course.faculty?.name}
                  </p>
                </div>
                <div className="course-stats">
                  <span className="students-count">
                    <i className="fas fa-users"></i>
                    {/* {course.enrolledStudents?.length || 0} students */}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-history"></i>
              Recent Activity
            </h2>
          </div>
          
          <div className="activity-sections">
            {/* Recent Forums */}
            <div className="activity-card">
              <h3>
                <i className="fas fa-comments"></i>
                Recent Discussions
              </h3>
              <div className="activity-list">
                {/* {stats.recentActivity.forums.length > 0 ? (
                  stats.recentActivity.forums.map((forum) => (
                    <div 
                      key={forum._id}
                      className="activity-item"
                      onClick={() => navigate(`/forums/${forum._id}`)}
                    >
                      <div className="activity-info">
                        <h5>{forum.title}</h5>
                        <div className="activity-meta">
                          <span>by {forum.author?.name}</span>
                          <span>in {forum.course?.name}</span>
                          <span>{new Date(forum.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-activity">
                    <p>No recent forum activity</p>
                  </div>
                )} */}
              </div>
            </div>

            {/* Recent Videos */}
            <div className="activity-card">
              <h3>
                <i className="fas fa-video"></i>
                New Lectures
              </h3>
              <div className="activity-list">
                {/* {stats.recentActivity.videos.length > 0 ? (
                  stats.recentActivity.videos.map((video) => (
                    <div 
                      key={video._id}
                      className="activity-item"
                      onClick={() => navigate('/video-lectures')}
                    >
                      <div className="activity-info">
                        <h5>{video.title}</h5>
                        <div className="activity-meta">
                          <span>by {video.uploadedBy?.name}</span>
                          <span>in {video.course?.name}</span>
                          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-activity">
                    <p>No recent videos</p>
                  </div>
                )} */}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <i className="fas fa-bolt"></i>
              Quick Actions
            </h2>
          </div>
          
          <div className="quick-actions">
            <button 
              className="action-btn"
              onClick={() => navigate('/assignments')}
            >
              <i className="fas fa-tasks"></i>
              <span>View Assignments</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/forums')}
            >
              <i className="fas fa-comments"></i>
              <span>Browse Forums</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/video-lectures')}
            >
              <i className="fas fa-video"></i>
              <span>Watch Lectures</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/calendar')}
            >
              <i className="fas fa-calendar"></i>
              <span>View Calendar</span>
            </button>
            <button 
              className="action-btn"
              onClick={() => navigate('/chat')}
            >
              <i className="fas fa-message"></i>
              <span>Messages</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;