import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const CourseDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState([]);
  const [videos, setVideos] = useState([]);
  const [forums, setForums] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal'
  });

  useEffect(() => {
    loadCourse();
    loadCourseContent();
  }, [id, activeTab]);

  const loadCourse = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/courses/${id}`);
      setCourse(response.data.data);
    } catch (error) {
      console.error('Error loading course:', error);
      if (error.response?.status === 404) {
        toast.error('Course not found');
        navigate('/courses');
      } else {
        toast.error('Failed to load course');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCourseContent = async () => {
    try {
      switch (activeTab) {
        case 'assignments':
          const assignmentsRes = await axios.get(`${process.env.REACT_APP_API_URL}/assignments?course=${id}`);
          setAssignments(assignmentsRes.data.data || []);
          break;
        
        case 'videos':
          const videosRes = await axios.get(`${process.env.REACT_APP_API_URL}/videos?course=${id}`);
          setVideos(videosRes.data.data || []);
          break;
        
        case 'forums':
          const forumsRes = await axios.get(`${process.env.REACT_APP_API_URL}/forums?course=${id}`);
          setForums(forumsRes.data.data.forums || []);
          break;
        
        case 'students':
          if (['faculty', 'ta', 'admin'].includes(user?.role)) {
            const studentsRes = await axios.get(`${process.env.REACT_APP_API_URL}/courses/${id}/students`);
            setStudents(studentsRes.data.data || []);
          }
          break;
        
        case 'announcements':
          const announcementsRes = await axios.get(`${process.env.REACT_APP_API_URL}/courses/${id}/announcements`);
          setAnnouncements(announcementsRes.data.data || []);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${activeTab}:`, error);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/courses/${id}/announcements`, announcementForm);
      setAnnouncements(prev => [response.data.data, ...prev]);
      setShowAnnouncementModal(false);
      setAnnouncementForm({ title: '', content: '', priority: 'normal' });
      toast.success('Announcement posted successfully!');
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    }
  };

  const handleEnrollment = async (action) => {
    try {
      if (action === 'enroll') {
        await axios.post(`${process.env.REACT_APP_API_URL}/courses/${id}/enroll`);
        toast.success('Enrolled successfully!');
      } else {
        await axios.post(`${process.env.REACT_APP_API_URL}/courses/${id}/unenroll`);
        toast.success('Unenrolled successfully!');
      }
      loadCourse();
    } catch (error) {
      console.error(`Error ${action}ing:`, error);
      toast.error(`Failed to ${action}`);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const canManageCourse = () => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'faculty') {
      return user.teachingCourses?.some(tc => tc.toString() === id);
    }
    if (user?.role === 'ta') {
      return user.assistingCourses?.some(ac => ac.toString() === id);
    }
    return false;
  };

  const isEnrolled = () => {
    if (user?.role === 'student') {
      return user.enrolledCourses?.some(ec => ec.course.toString() === id);
    }
    return canManageCourse();
  };

  if (loading) {
    return <div className="loading">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="error-state">
        <h2>Course not found</h2>
        <button onClick={() => navigate('/courses')} className="btn btn-primary">
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="course-detail-page">
      <div className="course-detail-header">
        <button 
          onClick={() => navigate('/courses')} 
          className="back-btn"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Courses
        </button>

        <div className="header-actions">
          {user?.role === 'student' && (
            <button 
              className={`btn ${isEnrolled() ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => handleEnrollment(isEnrolled() ? 'unenroll' : 'enroll')}
            >
              <i className={`fas ${isEnrolled() ? 'fa-sign-out-alt' : 'fa-user-plus'}`}></i>
              {isEnrolled() ? 'Unenroll' : 'Enroll'}
            </button>
          )}
          
          {canManageCourse() && (
            <>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate(`/courses/${id}/edit`)}
              >
                <i className="fas fa-edit"></i>
                Edit Course
              </button>
              <button 
                className="btn btn-info"
                onClick={() => setShowAnnouncementModal(true)}
              >
                <i className="fas fa-bullhorn"></i>
                New Announcement
              </button>
            </>
          )}
        </div>
      </div>

      {/* Course Header */}
      <div className="course-header-section">
        <div className="course-banner">
          {course.banner ? (
            <img src={course.banner} alt={course.name} />
          ) : (
            <div className="default-banner">
              <i className="fas fa-graduation-cap"></i>
            </div>
          )}
        </div>
        
        <div className="course-info">
          <div className="course-title-section">
            <h1>{course.name}</h1>
            <span className="course-code">{course.code}</span>
          </div>
          
          <div className="course-meta">
            <div className="meta-item">
              <i className="fas fa-calendar"></i>
              <span>{course.semester} {course.year}</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-graduation-cap"></i>
              <span>{course.credits} Credits</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-users"></i>
              <span>{course.enrolledStudents?.length || 0} Students</span>
            </div>
            <div className="meta-item">
              <i className="fas fa-chalkboard-teacher"></i>
              <span>{course.faculty?.name}</span>
            </div>
          </div>

          {course.description && (
            <div className="course-description">
              <p>{course.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="course-tabs">
        <nav className="tabs-nav">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <i className="fas fa-info-circle"></i>
            Overview
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <i className="fas fa-tasks"></i>
            Assignments
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
            onClick={() => setActiveTab('videos')}
          >
            <i className="fas fa-video"></i>
            Lectures
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'forums' ? 'active' : ''}`}
            onClick={() => setActiveTab('forums')}
          >
            <i className="fas fa-comments"></i>
            Forums
          </button>
          
          {canManageCourse() && (
            <button 
              className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
              onClick={() => setActiveTab('students')}
            >
              <i className="fas fa-user-graduate"></i>
              Students
            </button>
          )}
          
          <button 
            className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <i className="fas fa-bullhorn"></i>
            Announcements
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="course-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="overview-grid">
              <div className="course-stats">
                <h2>Course Statistics</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <i className="fas fa-tasks"></i>
                    <div className="stat-info">
                      <span className="stat-number">12</span>
                      <span className="stat-label">Assignments</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <i className="fas fa-video"></i>
                    <div className="stat-info">
                      <span className="stat-number">8</span>
                      <span className="stat-label">Video Lectures</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <i className="fas fa-comments"></i>
                    <div className="stat-info">
                      <span className="stat-number">25</span>
                      <span className="stat-label">Forum Posts</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <i className="fas fa-users"></i>
                    <div className="stat-info">
                      <span className="stat-number">{course.enrolledStudents?.length || 0}</span>
                      <span className="stat-label">Students</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="course-schedule">
                <h2>Schedule</h2>
                <div className="schedule-info">
                  {course.schedule ? (
                    <div>
                      <p><strong>Class Times:</strong> {course.schedule}</p>
                      <p><strong>Location:</strong> {course.location || 'Online'}</p>
                      <p><strong>Office Hours:</strong> {course.officeHours || 'By appointment'}</p>
                    </div>
                  ) : (
                    <p>Schedule information not available</p>
                  )}
                </div>
              </div>

              <div className="course-objectives">
                <h2>Learning Objectives</h2>
                <div className="objectives-list">
                  {course.objectives && course.objectives.length > 0 ? (
                    <ul>
                      {course.objectives.map((objective, index) => (
                        <li key={index}>{objective}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Learning objectives will be updated soon.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="assignments-content">
            <div className="content-header">
              <h2>Course Assignments</h2>
              {canManageCourse() && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/assignments/create?course=${id}`)}
                >
                  <i className="fas fa-plus"></i>
                  Create Assignment
                </button>
              )}
            </div>

            <div className="assignments-list">
              {assignments.length > 0 ? (
                assignments.map(assignment => (
                  <div key={assignment._id} className="assignment-card">
                    <div className="assignment-info">
                      <h3>{assignment.title}</h3>
                      <p>{assignment.description}</p>
                      <div className="assignment-meta">
                        <span className="due-date">
                          <i className="fas fa-calendar-alt"></i>
                          Due: {formatDate(assignment.dueDate)}
                        </span>
                        <span className="points">
                          <i className="fas fa-star"></i>
                          {assignment.maxPoints} points
                        </span>
                      </div>
                    </div>
                    <div className="assignment-actions">
                      <button 
                        className="btn btn-outline"
                        onClick={() => navigate(`/assignments/${assignment._id}`)}
                      >
                        <i className="fas fa-eye"></i>
                        View
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="fas fa-clipboard-list"></i>
                  <p>No assignments posted yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="videos-content">
            <div className="content-header">
              <h2>Video Lectures</h2>
              {canManageCourse() && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/video-lectures/upload?course=${id}`)}
                >
                  <i className="fas fa-upload"></i>
                  Upload Video
                </button>
              )}
            </div>

            <div className="videos-grid">
              {videos.length > 0 ? (
                videos.map(video => (
                  <div key={video._id} className="video-card">
                    <div className="video-thumbnail">
                      <img 
                        src={video.thumbnailUrl || '/default-thumbnail.jpg'} 
                        alt={video.title}
                      />
                      <div className="video-duration">
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <div className="video-info">
                      <h4>{video.title}</h4>
                      <p>{video.description}</p>
                      <div className="video-meta">
                        <span>{formatDate(video.createdAt)}</span>
                        <span>{video.viewCount} views</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="fas fa-video"></i>
                  <p>No video lectures available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Forums Tab */}
        {activeTab === 'forums' && (
          <div className="forums-content">
            <div className="content-header">
              <h2>Discussion Forums</h2>
              {user?.role === 'student' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/forums/create?course=${id}`)}
                >
                  <i className="fas fa-plus"></i>
                  New Discussion
                </button>
              )}
            </div>

            <div className="forums-list">
              {forums.length > 0 ? (
                forums.map(forum => (
                  <div 
                    key={forum._id} 
                    className="forum-card"
                    onClick={() => navigate(`/forums/${forum._id}`)}
                  >
                    <div className="forum-info">
                      <h4>{forum.title}</h4>
                      <p>{forum.description}</p>
                      <div className="forum-meta">
                        <span>by {forum.author?.name}</span>
                        <span>{forum.posts?.length || 0} replies</span>
                        <span>{formatDate(forum.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="fas fa-comments"></i>
                  <p>No discussions yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && canManageCourse() && (
          <div className="students-content">
            <div className="content-header">
              <h2>Enrolled Students ({students.length})</h2>
              <div className="students-actions">
                <button className="btn btn-outline">
                  <i className="fas fa-download"></i>
                  Export List
                </button>
                <button className="btn btn-secondary">
                  <i className="fas fa-user-plus"></i>
                  Add Student
                </button>
              </div>
            </div>

            <div className="students-table">
              {students.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Student ID</th>
                      <th>Enrolled</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(student => (
                      <tr key={student._id}>
                        <td>
                          <div className="student-info">
                            <div className="student-avatar">
                              {student.avatar ? (
                                <img src={student.avatar} alt={student.name} />
                              ) : (
                                <div className="avatar-placeholder">
                                  {student.name?.charAt(0)?.toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span>{student.name}</span>
                          </div>
                        </td>
                        <td>{student.email}</td>
                        <td>{student.studentId}</td>
                        <td>{formatDate(student.enrolledAt || student.createdAt)}</td>
                        <td>
                          <div className="student-actions">
                            <button className="btn btn-outline btn-sm">
                              <i className="fas fa-eye"></i>
                              View
                            </button>
                            <button className="btn btn-danger btn-sm">
                              <i className="fas fa-user-minus"></i>
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-user-graduate"></i>
                  <p>No students enrolled yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="announcements-content">
            <div className="content-header">
              <h2>Course Announcements</h2>
            </div>

            <div className="announcements-list">
              {announcements.length > 0 ? (
                announcements.map(announcement => (
                  <div key={announcement._id} className={`announcement-card ${announcement.priority}`}>
                    <div className="announcement-header">
                      <h4>{announcement.title}</h4>
                      <div className="announcement-meta">
                        <span className={`priority-badge ${announcement.priority}`}>
                          {announcement.priority}
                        </span>
                        <span>{formatDate(announcement.createdAt)}</span>
                      </div>
                    </div>
                    <div className="announcement-content">
                      <p>{announcement.content}</p>
                    </div>
                    <div className="announcement-author">
                      by {announcement.author?.name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <i className="fas fa-bullhorn"></i>
                  <p>No announcements yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      {showAnnouncementModal && (
        <div className="modal-overlay" onClick={() => setShowAnnouncementModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Announcement</h3>
              <button 
                className="modal-close"
                onClick={() => setShowAnnouncementModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="modal-body">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="content">Content *</label>
                <textarea
                  id="content"
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm(prev => ({ 
                    ...prev, 
                    content: e.target.value 
                  }))}
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  value={announcementForm.priority}
                  onChange={(e) => setAnnouncementForm(prev => ({ 
                    ...prev, 
                    priority: e.target.value 
                  }))}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowAnnouncementModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-bullhorn"></i>
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetailPage;