import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    totalAssignments: 0,
    submittedAssignments: 0,
    averageGrade: 0,
    courses: []
  });
  const [loading, setLoading] = useState(true);

  const loadStudentData = async () => {
    try {
      console.log('📊 Loading student dashboard data...');
      console.log('API URL:', process.env.REACT_APP_API_URL);
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/dashboard/student-stats`, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Dashboard API Response:', response.data);
      
      if (response.data && response.data.success) {
        const dashboardData = response.data.data;
        console.log('📈 Setting dashboard stats:', dashboardData);
        
        setStats({
          enrolledCourses: dashboardData.enrolledCourses || 0,
          totalAssignments: dashboardData.totalAssignments || 0,
          submittedAssignments: dashboardData.submittedAssignments || 0,
          averageGrade: dashboardData.averageGrade || 0,
          courses: Array.isArray(dashboardData.courses) ? dashboardData.courses : []
        });
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('💥 Error loading student dashboard:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      // Show specific error message
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Please check your permissions.');
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Request timeout. Please check your connection.');
      } else {
        toast.error('Failed to load dashboard data. Using offline mode.');
      }
      
      // Set safe default values
      setStats({
        enrolledCourses: 0,
        totalAssignments: 0,
        submittedAssignments: 0,
        averageGrade: 0,
        courses: []
      });
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

  return (
    <div className="student-dashboard">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p>Here's what's happening with your courses today.</p>
        </div>
        <div className="quick-stats">
          <div className="stat-card">
            <i className="fas fa-book"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.enrolledCourses || 0}</span>
              <span className="stat-label">Enrolled Courses</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-tasks"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.totalAssignments || 0}</span>
              <span className="stat-label">Total Assignments</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-check-circle"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.submittedAssignments || 0}</span>
              <span className="stat-label">Submitted</span>
            </div>
          </div>
          <div className="stat-card">
            <i className="fas fa-percentage"></i>
            <div className="stat-info">
              <span className="stat-number">{stats.averageGrade || 0}%</span>
              <span className="stat-label">Avg Grade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
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
                  {Math.round(((stats.submittedAssignments || 0) / (stats.totalAssignments || 1)) * 100)}%
                </span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${Math.round(((stats.submittedAssignments || 0) / (stats.totalAssignments || 1)) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className="progress-details">
                <span>{stats.submittedAssignments || 0} of {stats.totalAssignments || 0} completed</span>
              </div>
            </div>

            <div className="progress-card">
              <div className="progress-header">
                <h3>Overall Grade</h3>
                <span className="grade-display">{stats.averageGrade || 0}%</span>
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
            {stats.courses && Array.isArray(stats.courses) && stats.courses.length > 0 ? (
              stats.courses.map((course) => (
                <div 
                  key={course._id || Math.random()} 
                  className="course-card"
                  onClick={() => navigate(`/courses/${course._id}`)}
                >
                  <div className="course-header">
                    <div className="course-code">{course.code || 'N/A'}</div>
                    <div className="course-semester">{course.semester || ''} {course.year || ''}</div>
                  </div>
                  <div className="course-content">
                    <h4>{course.name || 'Unnamed Course'}</h4>
                    <p className="course-instructor">
                      <i className="fas fa-chalkboard-teacher"></i>
                      {course.faculty?.name || course.facultyName || 'No Instructor'}
                    </p>
                  </div>
                  <div className="course-stats">
                    <span className="students-count">
                      <i className="fas fa-users"></i>
                      {course.enrolledStudents?.length || 0} students
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-book"></i>
                <h3>No Courses Found</h3>
                <p>You are not enrolled in any courses yet.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/courses')}
                >
                  Browse Courses
                </button>
              </div>
            )}
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