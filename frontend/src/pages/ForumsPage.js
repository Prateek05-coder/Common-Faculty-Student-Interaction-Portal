import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const ForumsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { action } = useParams();
  const [forums, setForums] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [filters, setFilters] = useState({
    category: 'all',
    search: '',
    course: 'all'
  });

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'general',
    courseId: '',
    tags: []
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadForums();
    loadUserCourses();
    
    if (action === 'create') {
      setShowCreateModal(true);
    }
  }, [filters, action]);

  const loadUserCourses = async () => {
    try {
      setCoursesLoading(true);
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
      setCourses([]);
    } finally {
      setCoursesLoading(false);
    }
  };

  const loadForums = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.category !== 'all') params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.course !== 'all') params.append('course', filters.course);

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/forums?${params}`);
      setForums(response.data.data?.forums || []);
    } catch (error) {
      console.error('Error loading forums:', error);
      toast.error('Failed to load forums');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!createForm.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!createForm.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!createForm.courseId) {
      newErrors.courseId = 'Please select a course';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateForum = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/forums`, createForm);
      
      setForums(prev => [response.data.data, ...prev]);
      handleCloseModal();
      toast.success('Discussion created successfully!');
      navigate(`/forums/${response.data.data._id}`);
      
    } catch (error) {
      console.error('Error creating forum:', error);
      const message = error.response?.data?.message || 'Failed to create forum';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setCreateForm({
      title: '',
      description: '',
      category: 'general',
      courseId: '',
      tags: []
    });
    setErrors({});
    
    if (action === 'create') {
      navigate('/forums', { replace: true });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);
    
    setCreateForm(prev => ({
      ...prev,
      tags
    }));
  };

  const handlePinForum = async (forumId, currentPinStatus) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/forums/${forumId}/pin`);
      
      setForums(prev => prev.map(forum => 
        forum._id === forumId 
          ? { ...forum, isPinned: !currentPinStatus }
          : forum
      ));
      
      toast.success(currentPinStatus ? 'Forum unpinned' : 'Forum pinned');
    } catch (error) {
      console.error('Error pinning forum:', error);
      toast.error('Failed to update forum');
    }
  };

  const handleLockForum = async (forumId, currentLockStatus) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_URL}/forums/${forumId}/lock`);
      
      setForums(prev => prev.map(forum => 
        forum._id === forumId 
          ? { ...forum, isLocked: !currentLockStatus }
          : forum
      ));
      
      toast.success(currentLockStatus ? 'Forum unlocked' : 'Forum locked');
    } catch (error) {
      console.error('Error locking forum:', error);
      toast.error('Failed to update forum');
    }
  };

  const handleForumClick = (forumId) => {
    navigate(`/forums/${forumId}`);
  };

  const canModerate = ['faculty', 'admin', 'ta'].includes(user?.role);
  const canCreateForum = user?.role === 'student';

  const getCategoryColor = (category) => {
    const colors = {
      general: 'gray',
      'assignment-help': 'yellow',
      'course-discussion': 'blue',
      'technical-support': 'purple',
      announcements: 'green'
    };
    return colors[category] || 'gray';
  };

  if (loading) {
    return <div className="loading">Loading forums...</div>;
  }

  return (
    <div className="forums-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Discussion Forums</h1>
            <p>
              {canCreateForum 
                ? "Ask questions, share knowledge, and collaborate with your peers" 
                : "Help students by answering their questions and participating in discussions"}
            </p>
          </div>
          {canCreateForum && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
              disabled={coursesLoading || courses.length === 0}
            >
              <i className="fas fa-plus"></i>
              New Discussion
            </button>
          )}
        </div>
      </div>

      {/* Show message if no courses */}
      {!coursesLoading && courses.length === 0 && canCreateForum && (
        <div className="alert alert-info">
          <i className="fas fa-info-circle"></i>
          You need to be enrolled in at least one course to create discussions.
        </div>
      )}

      {/* Filters */}
      <div className="forums-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label>Category:</label>
            <select 
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="all">All Categories</option>
              <option value="general">General Discussion</option>
              <option value="assignment-help">Assignment Help</option>
              <option value="course-discussion">Course Discussion</option>
              <option value="technical-support">Technical Support</option>
              <option value="announcements">Announcements</option>
            </select>
          </div>

          {courses.length > 0 && (
            <div className="filter-group">
              <label>Course:</label>
              <select 
                value={filters.course}
                onChange={(e) => setFilters(prev => ({ ...prev, course: e.target.value }))}
              >
                <option value="all">All Courses</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.name} ({course.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group search-group">
            <label>Search:</label>
            <div className="search-input">
              <input
                type="text"
                placeholder="Search forums..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
              <i className="fas fa-search"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Forums List */}
      <div className="forums-list">
        {forums.length > 0 ? (
          forums.map(forum => (
            <div 
              key={forum._id} 
              className={`forum-item ${forum.isPinned ? 'pinned' : ''} ${forum.isLocked ? 'locked' : ''}`}
            >
              <div className="forum-content">
                <div className="forum-header">
                  <div className="forum-badges">
                    {forum.isPinned && (
                      <span className="badge pinned">
                        <i className="fas fa-thumbtack"></i> Pinned
                      </span>
                    )}
                    {forum.isLocked && (
                      <span className="badge locked">
                        <i className="fas fa-lock"></i> Locked
                      </span>
                    )}
                    <span className={`category-badge ${getCategoryColor(forum.category)}`}>
                      {forum.category.replace('-', ' ')}
                    </span>
                  </div>

                  {canModerate && (
                    <div className="moderator-actions">
                      <button 
                        className={`btn-icon ${forum.isPinned ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePinForum(forum._id, forum.isPinned);
                        }}
                        title="Pin Forum"
                      >
                        <i className="fas fa-thumbtack"></i>
                      </button>
                      <button 
                        className={`btn-icon ${forum.isLocked ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLockForum(forum._id, forum.isLocked);
                        }}
                        title="Lock Forum"
                      >
                        <i className="fas fa-lock"></i>
                      </button>
                    </div>
                  )}
                </div>

                <h3 
                  className="forum-title"
                  onClick={() => handleForumClick(forum._id)}
                  style={{ cursor: 'pointer' }}
                >
                  {forum.title}
                </h3>

                <p className="forum-description">{forum.description}</p>

                <div className="forum-meta">
                  <div className="forum-info">
                    <span className="author">
                      <i className="fas fa-user"></i>
                      {forum.author?.name}
                      <span className={`role-badge ${forum.author?.role}`}>
                        {forum.author?.role}
                      </span>
                    </span>
                    <span className="course">
                      <i className="fas fa-book"></i>
                      {forum.course?.name}
                    </span>
                    <span className="created">
                      <i className="fas fa-calendar"></i>
                      {new Date(forum.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="forum-stats">
                    <span className="posts-count">
                      <i className="fas fa-comments"></i>
                      {forum.posts?.length || 0} posts
                    </span>
                    <span className="views-count">
                      <i className="fas fa-eye"></i>
                      {forum.viewCount || 0} views
                    </span>
                    <span className="last-activity">
                      <i className="fas fa-clock"></i>
                      {new Date(forum.lastActivity).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {forum.tags && forum.tags.length > 0 && (
                  <div className="forum-tags">
                    {forum.tags.map((tag, index) => (
                      <span key={index} className="tag">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <i className="fas fa-comments"></i>
            <h3>No forums found</h3>
            <p>
              {canCreateForum && courses.length > 0
                ? "Start a new discussion to get the conversation going!"
                : "No discussions available yet."}
            </p>
            {canCreateForum && courses.length > 0 && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Forum
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Forum Modal - Only for Students */}
      {showCreateModal && canCreateForum && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Discussion</h3>
              <button 
                className="modal-close"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateForum} className="modal-body">
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={createForm.title}
                  onChange={handleInputChange}
                  placeholder="Enter a descriptive title..."
                  className={errors.title ? 'error' : ''}
                  required
                />
                {errors.title && <span className="error-message">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  name="description"
                  value={createForm.description}
                  onChange={handleInputChange}
                  placeholder="Describe what you'd like to discuss..."
                  rows="4"
                  className={errors.description ? 'error' : ''}
                  required
                />
                {errors.description && <span className="error-message">{errors.description}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={createForm.category}
                    onChange={handleInputChange}
                  >
                    <option value="general">General Discussion</option>
                    <option value="assignment-help">Assignment Help</option>
                    <option value="course-discussion">Course Discussion</option>
                    <option value="technical-support">Technical Support</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="courseId">Course *</label>
                  <select
                    id="courseId"
                    name="courseId"
                    value={createForm.courseId}
                    onChange={handleInputChange}
                    className={errors.courseId ? 'error' : ''}
                    required
                    disabled={coursesLoading}
                  >
                    <option value="">
                      {coursesLoading ? 'Loading courses...' : 'Select a course'}
                    </option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                  {errors.courseId && <span className="error-message">{errors.courseId}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  placeholder="e.g., javascript, database, homework"
                  onChange={handleTagsChange}
                />
                <small className="form-help">Add relevant tags to help others find your discussion</small>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting || coursesLoading || courses.length === 0}
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus"></i>
                      Create Forum
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumsPage;