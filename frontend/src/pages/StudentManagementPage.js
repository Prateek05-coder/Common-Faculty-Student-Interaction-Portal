import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const StudentManagementPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadStudents();
    }
  }, [selectedCourse, searchQuery, sortBy, filterBy]);

  const loadCourses = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/courses/teaching`);
      setCourses(response.data.data || []);
      if (response.data.data && response.data.data.length > 0) {
        setSelectedCourse(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!selectedCourse) return;

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/courses/${selectedCourse._id}/students`);
      let studentsData = response.data.data || [];

      // Apply search filter
      if (searchQuery) {
        studentsData = studentsData.filter(student => 
          student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      // Apply status filter
      if (filterBy !== 'all') {
        studentsData = studentsData.filter(student => student.enrollmentStatus === filterBy);
      }

      // Apply sorting
      studentsData.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'email':
            return a.email.localeCompare(b.email);
          case 'enrolledDate':
            return new Date(b.enrolledAt) - new Date(a.enrolledAt);
          case 'grade':
            return (b.currentGrade || 0) - (a.currentGrade || 0);
          default:
            return 0;
        }
      });

      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  };

  const handleViewDetails = async (student) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/students/${student._id}/details?courseId=${selectedCourse._id}`);
      setSelectedStudent(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading student details:', error);
      toast.error('Failed to load student details');
    }
  };

  const handleUpdateGrade = async (studentId, newGrade) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/courses/${selectedCourse._id}/students/${studentId}/grade`, {
        grade: newGrade
      });
      toast.success('Grade updated successfully');
      loadStudents();
    } catch (error) {
      console.error('Error updating grade:', error);
      toast.error('Failed to update grade');
    }
  };

  const exportStudentData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/courses/${selectedCourse._id}/students/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedCourse.code}_students.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Student data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export student data');
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
      <div className="student-management-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading student management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-management-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Student Management</h1>
            <p>Manage and monitor students in your courses</p>
          </div>
          <div className="header-actions">
            <button 
              className="btn btn-outline"
              onClick={exportStudentData}
              disabled={!selectedCourse || students.length === 0}
            >
              <i className="fas fa-download"></i>
              Export Data
            </button>
          </div>
        </div>
      </div>

      <div className="student-management-content">
        {/* Course Selection */}
        <div className="course-selection">
          <label htmlFor="course-select">Select Course:</label>
          <select
            id="course-select"
            value={selectedCourse?._id || ''}
            onChange={(e) => {
              const course = courses.find(c => c._id === e.target.value);
              setSelectedCourse(course);
            }}
          >
            {courses.map(course => (
              <option key={course._id} value={course._id}>
                {course.code} - {course.name} ({course.enrolledStudents?.length || 0} students)
              </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
          <>
            {/* Filters and Search */}
            <div className="student-filters">
              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-controls">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                  <option value="enrolledDate">Sort by Enrollment Date</option>
                  <option value="grade">Sort by Grade</option>
                </select>

                <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
                  <option value="all">All Students</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="dropped">Dropped</option>
                </select>
              </div>
            </div>

            {/* Course Statistics */}
            <div className="course-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-info">
                  <h3>{students.length}</h3>
                  <p>Total Students</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-user-check"></i>
                </div>
                <div className="stat-info">
                  <h3>{students.filter(s => s.enrollmentStatus === 'active').length}</h3>
                  <p>Active Students</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <div className="stat-info">
                  <h3>
                    {students.length > 0 
                      ? (students.reduce((sum, s) => sum + (s.currentGrade || 0), 0) / students.length).toFixed(1)
                      : '0.0'
                    }%
                  </h3>
                  <p>Average Grade</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-tasks"></i>
                </div>
                <div className="stat-info">
                  <h3>
                    {students.length > 0 
                      ? Math.round(students.reduce((sum, s) => sum + (s.assignmentCompletion || 0), 0) / students.length)
                      : 0
                    }%
                  </h3>
                  <p>Avg Completion</p>
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="students-table-container">
              {students.length > 0 ? (
                <div className="students-table">
                  <div className="table-header">
                    <div className="header-cell">Student</div>
                    <div className="header-cell">Enrollment</div>
                    <div className="header-cell">Progress</div>
                    <div className="header-cell">Grade</div>
                    <div className="header-cell">Last Active</div>
                    <div className="header-cell">Actions</div>
                  </div>

                  {students.map(student => (
                    <div key={student._id} className="table-row">
                      <div className="cell student-info">
                        <div className="student-avatar">
                          {student.avatar ? (
                            <img src={student.avatar} alt={student.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="student-details">
                          <div className="student-name">{student.name}</div>
                          <div className="student-email">{student.email}</div>
                        </div>
                      </div>

                      <div className="cell enrollment-info">
                        <div className="enrollment-date">
                          {new Date(student.enrolledAt).toLocaleDateString()}
                        </div>
                        <span className={`status-badge ${student.enrollmentStatus}`}>
                          {student.enrollmentStatus}
                        </span>
                      </div>

                      <div className="cell progress-info">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ width: `${student.assignmentCompletion || 0}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">
                          {student.assignmentCompletion || 0}% Complete
                        </span>
                      </div>

                      <div className="cell grade-info">
                        <div className="current-grade">
                          {student.currentGrade ? `${student.currentGrade}%` : 'No Grade'}
                        </div>
                        <div className="grade-trend">
                          {student.gradeTrend === 'up' && <i className="fas fa-arrow-up trend-up"></i>}
                          {student.gradeTrend === 'down' && <i className="fas fa-arrow-down trend-down"></i>}
                          {student.gradeTrend === 'stable' && <i className="fas fa-minus trend-stable"></i>}
                        </div>
                      </div>

                      <div className="cell last-active">
                        {student.lastActive 
                          ? new Date(student.lastActive).toLocaleDateString()
                          : 'Never'
                        }
                      </div>

                      <div className="cell actions">
                        <button 
                          className="btn btn-sm btn-outline"
                          onClick={() => handleViewDetails(student)}
                        >
                          <i className="fas fa-eye"></i>
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-users"></i>
                  <h3>No Students Found</h3>
                  <p>
                    {searchQuery || filterBy !== 'all' 
                      ? 'No students match your current filters.'
                      : 'No students are enrolled in this course yet.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content student-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Student Details</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="student-profile">
                <div className="profile-header">
                  <div className="profile-avatar">
                    {selectedStudent.avatar ? (
                      <img src={selectedStudent.avatar} alt={selectedStudent.name} />
                    ) : (
                      <div className="avatar-placeholder large">
                        {selectedStudent.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="profile-info">
                    <h3>{selectedStudent.name}</h3>
                    <p>{selectedStudent.email}</p>
                    <span className={`status-badge ${selectedStudent.enrollmentStatus}`}>
                      {selectedStudent.enrollmentStatus}
                    </span>
                  </div>
                </div>

                <div className="profile-stats">
                  <div className="stat-item">
                    <span className="stat-label">Current Grade:</span>
                    <span className="stat-value">{selectedStudent.currentGrade || 0}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Assignments Completed:</span>
                    <span className="stat-value">
                      {selectedStudent.completedAssignments || 0} / {selectedStudent.totalAssignments || 0}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Attendance:</span>
                    <span className="stat-value">{selectedStudent.attendanceRate || 0}%</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Last Active:</span>
                    <span className="stat-value">
                      {selectedStudent.lastActive 
                        ? new Date(selectedStudent.lastActive).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>
                </div>

                {selectedStudent.recentAssignments && (
                  <div className="recent-assignments">
                    <h4>Recent Assignments</h4>
                    <div className="assignments-list">
                      {selectedStudent.recentAssignments.map(assignment => (
                        <div key={assignment._id} className="assignment-item">
                          <div className="assignment-info">
                            <span className="assignment-title">{assignment.title}</span>
                            <span className="assignment-date">
                              {new Date(assignment.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="assignment-grade">
                            {assignment.grade ? `${assignment.grade}/${assignment.maxPoints}` : 'Not Graded'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagementPage;
