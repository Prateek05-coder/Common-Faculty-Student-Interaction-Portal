import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [teachingCourses, setTeachingCourses] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [pendingGrading, setPendingGrading] = useState([]);
  const [recentForums, setRecentForums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacultyData();
  }, []);

  const loadFacultyData = async () => {
    try {
      const [statsRes, coursesRes, assignmentsRes, forumsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/dashboard/faculty-stats`),
        axios.get(`${process.env.REACT_APP_API_URL}/courses/teaching`),
        axios.get(`${process.env.REACT_APP_API_URL}/assignments/submissions?status=pending&limit=10`),
        axios.get(`${process.env.REACT_APP_API_URL}/forums?limit=5`)
      ]);

      setStats(statsRes.data.data || {});
      setTeachingCourses(coursesRes.data.data || []);
      setRecentSubmissions(assignmentsRes.data.data?.submissions || []);
      setRecentForums(forumsRes.data.data?.forums || []);

      // Get pending grading from submissions
      const pendingItems = assignmentsRes.data.data?.submissions
        ?.filter(sub => !sub.grade)
        ?.slice(0, 5) || [];
      
      setPendingGrading(pendingItems);

    } catch (error) {
      console.error('Error loading faculty data:', error);
      // Set default empty values to prevent crashes
      setStats({});
      setTeachingCourses([]);
      setRecentSubmissions([]);
      setRecentForums([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeAssignment = async (submissionId, grade, feedback) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/assignments/submissions/${submissionId}/grade`, {
        grade,
        feedback
      });
      
      // Refresh data
      loadFacultyData();
    } catch (error) {
      console.error('Error grading assignment:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading faculty dashboard...</div>;
  }

  return (
    <div className="faculty-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.name}</h1>
        <p>Faculty Dashboard - Manage your courses and students</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon faculty">
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalCourses || 0}</h3>
            <p>Teaching Courses</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <i className="fas fa-users"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.totalStudents || 0}</h3>
            <p>Total Students</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <i className="fas fa-clipboard-check"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.pendingGrading || 0}</h3>
            <p>Pending Grading</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <i className="fas fa-chart-bar"></i>
          </div>
          <div className="stat-content">
            <h3>{stats.avgClassPerformance || 'N/A'}</h3>
            <p>Avg Class Performance</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Teaching Courses */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2><i className="fas fa-book"></i> Your Courses</h2>
            <a href="/courses/create" className="section-link">Create New Course</a>
          </div>
          <div className="courses-grid">
            {teachingCourses.length > 0 ? (
              teachingCourses.map((course) => (
                <div key={course._id} className="course-card faculty">
                  <div className="course-header">
                    <h4>{course.name}</h4>
                    <span className="course-code">{course.code}</span>
                  </div>
                  <div className="course-stats">
                    <div className="stat">
                      <span className="stat-number">{course.enrolledStudents?.length || 0}</span>
                      <span className="stat-label">Students</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{course.assignments?.length || 0}</span>
                      <span className="stat-label">Assignments</span>
                    </div>
                  </div>
                  <div className="course-actions">
                    <a href={`/courses/${course._id}`} className="btn btn-sm btn-primary">
                      Manage
                    </a>
                    <a href={`/assignments/create?course=${course._id}`} className="btn btn-sm btn-secondary">
                      New Assignment
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No courses assigned yet</p>
            )}
          </div>
        </div>

        {/* Pending Grading */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2><i className="fas fa-clipboard-list"></i> Pending Grading</h2>
            <a href="/assignments/grading" className="section-link">View All</a>
          </div>
          <div className="grading-list">
            {pendingGrading.length > 0 ? (
              pendingGrading.map((submission) => (
                <div key={submission._id} className="grading-item">
                  <div className="submission-info">
                    <h4>{submission.assignment?.title}</h4>
                    <p className="student-name">
                      <i className="fas fa-user"></i>
                      {submission.student?.name}
                    </p>
                    <p className="submission-date">
                      Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="grading-actions">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => window.location.href = `/assignments/${submission.assignment._id}/submissions/${submission._id}`}
                    >
                      Grade Now
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No pending grading</p>
            )}
          </div>
        </div>

        {/* Recent Forum Activity */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2><i className="fas fa-comments"></i> Recent Forum Activity</h2>
            <a href="/forums" className="section-link">View All Forums</a>
          </div>
          <div className="forums-list">
            {recentForums.length > 0 ? (
              recentForums.map((forum) => (
                <div key={forum._id} className="forum-item faculty">
                  <div className="forum-content">
                    <h4>{forum.title}</h4>
                    <p className="forum-desc">{forum.description}</p>
                    <div className="forum-meta">
                      <span className="author">By {forum.author?.name}</span>
                      <span className="course">{forum.course?.name}</span>
                      <span className="posts">{forum.posts?.length || 0} posts</span>
                    </div>
                  </div>
                  <div className="forum-actions">
                    {['faculty', 'admin', 'ta'].includes(user?.role) && (
                      <div className="moderator-actions">
                        <button className="btn-icon" title="Pin Forum">
                          <i className={`fas fa-thumbtack ${forum.isPinned ? 'pinned' : ''}`}></i>
                        </button>
                        <button className="btn-icon" title="Lock Forum">
                          <i className={`fas fa-lock ${forum.isLocked ? 'locked' : ''}`}></i>
                        </button>
                      </div>
                    )}
                    <a href={`/forums/${forum._id}`} className="btn btn-sm btn-outline">
                      View Discussion
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-data">No recent forum activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions faculty">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <a href="/assignments/create" className="action-btn primary">
            <i className="fas fa-plus"></i>
            Create Assignment
          </a>
          <a href="/forums/create" className="action-btn secondary">
            <i className="fas fa-bullhorn"></i>
            Make Announcement
          </a>
          <a href="/analytics" className="action-btn secondary">
            <i className="fas fa-chart-line"></i>
            View Analytics
          </a>
          <a href="/courses/manage" className="action-btn secondary">
            <i className="fas fa-cog"></i>
            Manage Courses
          </a>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;