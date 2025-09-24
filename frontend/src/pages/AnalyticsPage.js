import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/analytics?period=${selectedPeriod}`);
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Create mock data for now
      setAnalytics({
        totalStudents: 156,
        totalCourses: 12,
        totalAssignments: 48,
        totalVideos: 24,
        courseStats: [
          { name: 'Computer Science 101', students: 45, assignments: 8, completion: 78 },
          { name: 'Data Structures', students: 38, assignments: 10, completion: 85 },
          { name: 'Web Development', students: 42, assignments: 6, completion: 92 },
          { name: 'Database Systems', students: 31, assignments: 7, completion: 74 }
        ],
        assignmentStats: {
          submitted: 342,
          pending: 89,
          graded: 298,
          avgGrade: 82.5
        },
        videoStats: {
          totalViews: 1247,
          avgWatchTime: 18.5,
          completionRate: 67
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (!['faculty', 'admin'].includes(user?.role)) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-lock"></i>
          <h2>Access Denied</h2>
          <p>This page is only available to faculty and administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Analytics Dashboard</h1>
            <p>View detailed insights and performance statistics</p>
          </div>
          <div className="header-controls">
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="period-selector"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="semester">This Semester</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        {/* Overview Cards */}
        <div className="analytics-overview">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-info">
              <h3>{analytics.totalStudents}</h3>
              <p>Total Students</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-book"></i>
            </div>
            <div className="stat-info">
              <h3>{analytics.totalCourses}</h3>
              <p>Active Courses</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-tasks"></i>
            </div>
            <div className="stat-info">
              <h3>{analytics.totalAssignments}</h3>
              <p>Total Assignments</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-video"></i>
            </div>
            <div className="stat-info">
              <h3>{analytics.totalVideos}</h3>
              <p>Video Lectures</p>
            </div>
          </div>
        </div>

        {/* Course Performance */}
        <div className="analytics-section">
          <h2>Course Performance</h2>
          <div className="course-analytics">
            {analytics.courseStats.map((course, index) => (
              <div key={index} className="course-stat-card">
                <div className="course-header">
                  <h4>{course.name}</h4>
                  <span className="student-count">{course.students} students</span>
                </div>
                <div className="course-metrics">
                  <div className="metric">
                    <span className="metric-label">Assignments</span>
                    <span className="metric-value">{course.assignments}</span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Completion Rate</span>
                    <span className="metric-value">{course.completion}%</span>
                  </div>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${course.completion}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignment Analytics */}
        <div className="analytics-section">
          <h2>Assignment Analytics</h2>
          <div className="assignment-analytics">
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Submission Status</h4>
                <div className="submission-stats">
                  <div className="stat-item">
                    <span className="stat-label">Submitted</span>
                    <span className="stat-value submitted">{analytics.assignmentStats.submitted}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Pending</span>
                    <span className="stat-value pending">{analytics.assignmentStats.pending}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Graded</span>
                    <span className="stat-value graded">{analytics.assignmentStats.graded}</span>
                  </div>
                </div>
              </div>
              
              <div className="analytics-card">
                <h4>Grade Distribution</h4>
                <div className="grade-analytics">
                  <div className="avg-grade">
                    <span className="grade-value">{analytics.assignmentStats.avgGrade}%</span>
                    <span className="grade-label">Average Grade</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Analytics */}
        <div className="analytics-section">
          <h2>Video Lecture Analytics</h2>
          <div className="video-analytics">
            <div className="analytics-grid">
              <div className="analytics-card">
                <h4>Engagement Metrics</h4>
                <div className="video-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Views</span>
                    <span className="stat-value">{analytics.videoStats.totalViews}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Avg Watch Time</span>
                    <span className="stat-value">{analytics.videoStats.avgWatchTime} min</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Completion Rate</span>
                    <span className="stat-value">{analytics.videoStats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;