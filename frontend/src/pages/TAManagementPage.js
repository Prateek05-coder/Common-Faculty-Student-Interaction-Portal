import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const TAManagementPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [tas, setTAs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedTA, setSelectedTA] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load courses
      const coursesResponse = await axios.get(`${process.env.REACT_APP_API_URL}/courses`);
      setCourses(coursesResponse.data.data || []);

      // Load all TAs
      const usersResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users?role=ta`);
      setTAs(usersResponse.data.data || []);

      // Load all users for assignment
      const allUsersResponse = await axios.get(`${process.env.REACT_APP_API_URL}/users`);
      setAllUsers(allUsersResponse.data.data || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTA = async (e) => {
    e.preventDefault();
    
    if (!selectedTA || !selectedCourse) {
      toast.error('Please select both a TA and a course');
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/courses/${selectedCourse._id}/assign-ta`, {
        taId: selectedTA
      });

      toast.success('TA assigned successfully!');
      
      // Refresh data
      loadData();
      
      // Reset form
      setSelectedTA('');
      setSelectedCourse(null);
      setShowAssignModal(false);
      
    } catch (error) {
      console.error('Error assigning TA:', error);
      toast.error('Failed to assign TA');
    }
  };

  const handleRemoveTA = async (courseId, taId) => {
    if (!window.confirm('Are you sure you want to remove this TA from the course?')) {
      return;
    }

    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/courses/${courseId}/remove-ta`, {
        taId: taId
      });

      toast.success('TA removed successfully!');
      loadData();
      
    } catch (error) {
      console.error('Error removing TA:', error);
      toast.error('Failed to remove TA');
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
      <div className="ta-management-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading TA management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ta-management-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>TA Management</h1>
            <p>Assign and manage Teaching Assistants for your courses</p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAssignModal(true)}
          >
            <i className="fas fa-plus"></i>
            Assign TA
          </button>
        </div>
      </div>

      <div className="ta-management-content">
        {/* TA Overview */}
        <div className="ta-overview">
          <div className="overview-cards">
            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="card-info">
                <h3>{tas.length}</h3>
                <p>Total TAs</p>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-book"></i>
              </div>
              <div className="card-info">
                <h3>{courses.length}</h3>
                <p>Total Courses</p>
              </div>
            </div>
            
            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-link"></i>
              </div>
              <div className="card-info">
                <h3>
                  {courses.reduce((total, course) => 
                    total + (course.teachingAssistants ? course.teachingAssistants.length : 0), 0
                  )}
                </h3>
                <p>TA Assignments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Courses with TAs */}
        <div className="courses-section">
          <h2>Course TA Assignments</h2>
          
          {courses.length > 0 ? (
            <div className="courses-list">
              {courses.map(course => (
                <div key={course._id} className="course-ta-card">
                  <div className="course-header">
                    <div className="course-info">
                      <h3>{course.name}</h3>
                      <p>{course.code} • {course.semester} {course.year}</p>
                      <span className="faculty-name">
                        <i className="fas fa-chalkboard-teacher"></i>
                        Faculty: {course.faculty?.name}
                      </span>
                    </div>
                    
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setSelectedCourse(course);
                        setShowAssignModal(true);
                      }}
                    >
                      <i className="fas fa-plus"></i>
                      Add TA
                    </button>
                  </div>

                  <div className="tas-list">
                    {course.teachingAssistants && course.teachingAssistants.length > 0 ? (
                      <div className="assigned-tas">
                        <h4>Assigned TAs:</h4>
                        <div className="ta-items">
                          {course.teachingAssistants.map(ta => (
                            <div key={ta._id} className="ta-item">
                              <div className="ta-info">
                                <div className="ta-avatar">
                                  <i className="fas fa-user-graduate"></i>
                                </div>
                                <div className="ta-details">
                                  <span className="ta-name">{ta.name}</span>
                                  <span className="ta-email">{ta.email}</span>
                                </div>
                              </div>
                              
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveTA(course._id, ta._id)}
                                title="Remove TA"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="no-tas">
                        <i className="fas fa-user-slash"></i>
                        <p>No TAs assigned to this course</p>
                      </div>
                    )}
                  </div>

                  <div className="course-stats">
                    <div className="stat">
                      <span className="stat-number">{course.enrolledStudents?.length || 0}</span>
                      <span className="stat-label">Students</span>
                    </div>
                    <div className="stat">
                      <span className="stat-number">{course.teachingAssistants?.length || 0}</span>
                      <span className="stat-label">TAs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-book-open"></i>
              <h3>No Courses Found</h3>
              <p>Create courses to start assigning TAs.</p>
            </div>
          )}
        </div>

        {/* All TAs Section */}
        <div className="all-tas-section">
          <h2>All Teaching Assistants</h2>
          
          {tas.length > 0 ? (
            <div className="tas-grid">
              {tas.map(ta => {
                const assignedCourses = courses.filter(course => 
                  course.teachingAssistants?.some(courseTA => courseTA._id === ta._id)
                );
                
                return (
                  <div key={ta._id} className="ta-profile-card">
                    <div className="ta-avatar-large">
                      <i className="fas fa-user-graduate"></i>
                    </div>
                    
                    <div className="ta-profile-info">
                      <h4>{ta.name}</h4>
                      <p>{ta.email}</p>
                      
                      <div className="ta-assignments">
                        <span className="assignments-count">
                          {assignedCourses.length} course{assignedCourses.length !== 1 ? 's' : ''}
                        </span>
                        
                        {assignedCourses.length > 0 && (
                          <div className="assigned-courses">
                            {assignedCourses.map(course => (
                              <span key={course._id} className="course-tag">
                                {course.code}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <i className="fas fa-user-graduate"></i>
              <h3>No TAs Found</h3>
              <p>No teaching assistants are registered in the system.</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign TA Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content assign-ta-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Teaching Assistant</h2>
              <button 
                className="modal-close"
                onClick={() => setShowAssignModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAssignTA} className="modal-body">
              <div className="form-group">
                <label htmlFor="course">Select Course</label>
                <select
                  id="course"
                  value={selectedCourse?._id || ''}
                  onChange={(e) => {
                    const course = courses.find(c => c._id === e.target.value);
                    setSelectedCourse(course);
                  }}
                  required
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="ta">Select Teaching Assistant</label>
                <select
                  id="ta"
                  value={selectedTA}
                  onChange={(e) => setSelectedTA(e.target.value)}
                  required
                >
                  <option value="">Choose a TA...</option>
                  {allUsers
                    .filter(user => user.role === 'ta')
                    .filter(ta => !selectedCourse?.teachingAssistants?.some(courseTA => courseTA._id === ta._id))
                    .map(ta => (
                      <option key={ta._id} value={ta._id}>
                        {ta.name} ({ta.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <i className="fas fa-check"></i>
                  Assign TA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TAManagementPage;
