import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const CoursesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    description: '',
    semester: '',
    year: new Date().getFullYear(),
    credits: 3,
    maxStudents: 50
  });

  useEffect(() => {
    loadCourses();
    if (user?.role === 'student') {
      loadAllCourses();
    }
  }, []);

  const loadCourses = async () => {
    try {
      let endpoint = '';
      
      switch (user?.role) {
        case 'student':
          endpoint = '/courses/enrolled';
          break;
        case 'faculty':
          endpoint = '/courses/teaching';
          break;
        case 'ta':
          endpoint = '/courses/assisting';
          break;
        case 'admin':
          endpoint = '/courses';
          break;
        default:
          endpoint = '/courses';
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}${endpoint}`);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const loadAllCourses = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/courses/available`);
      console.log(response)
      setAllCourses(response.data.data || []);
    } catch (error) {
      console.error('Error loading all courses:', error);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/courses`, createForm);
      setCourses(prev => [response.data.data, ...prev]);
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        code: '',
        description: '',
        semester: '',
        year: new Date().getFullYear(),
        credits: 3,
        maxStudents: 50
      });
      toast.success('Course created successfully!');
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course');
    }
  };

  const handleEnrollCourse = async (courseId) => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/courses/${courseId}/enroll`);
      toast.success('Enrolled successfully!');
      loadCourses();
      setShowEnrollModal(false);
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll in course');
    }
  };

  const handleViewCourse = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  const canCreateCourses = ['faculty', 'admin'].includes(user?.role);
  const canEnrollCourses = user?.role === 'student';

  if (loading) {
    return <div className="loading">Loading courses...</div>;
  }

  return (
    <div className="courses-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              {user?.role === 'student' ? 'My Courses' : 
               user?.role === 'faculty' ? 'Teaching Courses' :
               user?.role === 'ta' ? 'Assisting Courses' : 'All Courses'}
            </h1>
            <p>
              {user?.role === 'student' ? 'Manage your enrolled courses and assignments' :
               user?.role === 'faculty' ? 'Manage your teaching courses and students' :
               user?.role === 'ta' ? 'Support courses you are assisting with' :
               'Manage all courses in the system'}
            </p>
          </div>
          
          <div className="header-actions">
            {canCreateCourses && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="fas fa-plus"></i>
                Create Course
              </button>
            )}
            
            {canEnrollCourses && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEnrollModal(true)}
              >
                <i className="fas fa-user-plus"></i>
                Enroll in Course
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="courses-grid">
        {courses.length > 0 ? (
          courses.map(course => (
            <div key={course._id} className="course-card">
              <div className="course-header">
                <div className="course-code">{course.code}</div>
                <div className="course-semester">
                  {course.semester} {course.year}
                </div>
              </div>
              
              <div className="course-content">
                <h3 className="course-title">{course.name}</h3>
                <p className="course-description">{course.description}</p>
                
                <div className="course-meta">
                  <div className="meta-item">
                    <i className="fas fa-graduation-cap"></i>
                    <span>{course.credits} Credits</span>
                  </div>
                  
                  {user?.role !== 'student' && (
                    <div className="meta-item">
                      <i className="fas fa-users"></i>
                      <span>{course.enrolledStudents?.length || 0} Students</span>
                    </div>
                  )}
                  
                  {(user?.role === 'student' || user?.role === 'ta') && course.faculty && (
                    <div className="meta-item">
                      <i className="fas fa-chalkboard-teacher"></i>
                      <span>{course.faculty.name}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="course-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => handleViewCourse(course._id)}
                >
                  <i className="fas fa-eye"></i>
                  View Details
                </button>
                
                {user?.role === 'faculty' && (
                  <>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => navigate(`/courses/${course._id}/assignments`)}
                    >
                      <i className="fas fa-tasks"></i>
                      Assignments
                    </button>
                    <button 
                      className="btn btn-info"
                      onClick={() => navigate(`/courses/${course._id}/students`)}
                    >
                      <i className="fas fa-users"></i>
                      Students
                    </button>
                  </>
                )}
                
                {user?.role === 'student' && (
                  <>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => navigate(`/courses/${course._id}/assignments`)}
                    >
                      <i className="fas fa-clipboard-list"></i>
                      Assignments
                    </button>
                    <button 
                      className="btn btn-info"
                      onClick={() => navigate(`/courses/${course._id}/videos`)}
                    >
                      <i className="fas fa-video"></i>
                      Videos
                    </button>
                  </>
                )}
                
                {user?.role === 'ta' && (
                  <button 
                    className="btn btn-warning"
                    onClick={() => navigate(`/courses/${course._id}/grading`)}
                  >
                    <i className="fas fa-clipboard-check"></i>
                    Grading
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fas fa-book-open"></i>
            <h3>No courses found</h3>
            <p>
              {canCreateCourses ? "Create your first course to get started!" :
               canEnrollCourses ? "Enroll in a course to see it here!" :
               "No courses available."}
            </p>
            
            {canCreateCourses && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Course
              </button>
            )}
            
            {canEnrollCourses && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowEnrollModal(true)}
              >
                Browse Courses
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {showCreateModal && canCreateCourses && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Course</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Course Name *</label>
                  <input
                    type="text"
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="code">Course Code *</label>
                  <input
                    type="text"
                    id="code"
                    value={createForm.code}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g., CS101"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="semester">Semester</label>
                  <select
                    id="semester"
                    value={createForm.semester}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, semester: e.target.value }))}
                  >
                    <option value="">Select Semester</option>
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="year">Year</label>
                  <input
                    type="number"
                    id="year"
                    value={createForm.year}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="credits">Credits</label>
                  <input
                    type="number"
                    id="credits"
                    value={createForm.credits}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, credits: parseInt(e.target.value) }))}
                    min="1"
                    max="6"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="maxStudents">Max Students</label>
                  <input
                    type="number"
                    id="maxStudents"
                    value={createForm.maxStudents}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, maxStudents: parseInt(e.target.value) }))}
                    min="5"
                    max="200"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll in Course Modal */}
      {showEnrollModal && canEnrollCourses && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Available Courses</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEnrollModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="available-courses-list">
                {allCourses.length > 0 ? (
                  allCourses.map(course => {
                    const isEnrolled = courses.some(c => c._id === course._id);
                    const isFull = course.enrolledStudents?.length >= course.maxStudents;
                    
                    return (
                      <div key={course._id} className="available-course-item">
                        <div className="course-info">
                          <h4>{course.name} ({course.code})</h4>
                          <p>{course.description}</p>
                          <div className="course-details">
                            <span>{course.credits} credits</span>
                            <span>{course.enrolledStudents?.length || 0}/{course.maxStudents} students</span>
                            <span>{course.semester} {course.year}</span>
                          </div>
                        </div>
                        <div className="course-enroll-action">
                          {isEnrolled ? (
                            <span className="enrolled-badge">
                              <i className="fas fa-check"></i>
                              Enrolled
                            </span>
                          ) : isFull ? (
                            <span className="full-badge">
                              <i className="fas fa-times"></i>
                              Full
                            </span>
                          ) : (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleEnrollCourse(course._id)}
                            >
                              <i className="fas fa-user-plus"></i>
                              Enroll
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-courses">
                    <p>No courses available for enrollment.</p>
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

export default CoursesPage;