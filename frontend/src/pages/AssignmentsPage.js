import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const AssignmentsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionModal, setSubmissionModal] = useState(false);

  // Assignment creation form
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    instructions: '',
    courseId: '',
    dueDate: '',
    maxPoints: 100,
    submissionType: 'both',
    allowLateSubmission: false,
    latePenalty: 0
  });

  // Submission form
  const [submissionForm, setSubmissionForm] = useState({
    textSubmission: '',
    files: []
  });

  const [filters, setFilters] = useState({
    status: 'all',
    course: 'all',
    sortBy: 'dueDate'
  });

  useEffect(() => {
    loadAssignments();
    loadCourses();
  }, [filters]);

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
        default:
          endpoint = '/courses';
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}${endpoint}`);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.course !== 'all') params.append('course', filters.course);
      if (filters.status !== 'all') params.append('status', filters.status);
      params.append('sortBy', filters.sortBy);

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/assignments?${params}`);
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/assignments`, {
        ...assignmentForm,
        faculty: user._id
      });

      setAssignments(prev => [response.data.data, ...prev]);
      setShowCreateModal(false);
      resetAssignmentForm();
      toast.success('Assignment created successfully!');

    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error('Failed to create assignment');
    }
  };

  const handleSubmitAssignment = async (assignmentId) => {
    try {
      const formData = new FormData();
      formData.append('textSubmission', submissionForm.textSubmission);
      
      submissionForm.files.forEach((file) => {
        formData.append('files', file);
      });

      await axios.post(`${process.env.REACT_APP_API_URL}/assignments/${assignmentId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Assignment submitted successfully!');
      setSubmissionModal(false);
      setSubmissionForm({ textSubmission: '', files: [] });
      loadAssignments();

    } catch (error) {
      console.error('Error submitting assignment:', error);
      toast.error('Failed to submit assignment');
    }
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      title: '',
      description: '',
      instructions: '',
      courseId: '',
      dueDate: '',
      maxPoints: 100,
      submissionType: 'both',
      allowLateSubmission: false,
      latePenalty: 0
    });
  };

  const getAssignmentStatus = (assignment) => {
    if (user.role === 'student') {
      const submission = assignment.submissions?.find(sub => sub.student === user._id);
      if (submission) {
        return submission.status === 'graded' ? 'graded' : 'submitted';
      }
      return new Date(assignment.dueDate) < new Date() ? 'overdue' : 'pending';
    }
    
    if (['faculty', 'ta'].includes(user.role)) {
      const pendingCount = assignment.submissions?.filter(sub => sub.status === 'submitted').length || 0;
      return pendingCount > 0 ? `${pendingCount} pending` : 'no submissions';
    }
    
    return assignment.status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      submitted: 'info',
      graded: 'success',
      overdue: 'danger',
      draft: 'secondary',
      published: 'success'
    };
    return colors[status] || 'secondary';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canCreateAssignments = ['faculty', 'admin'].includes(user?.role);
  const canSubmitAssignments = user?.role === 'student';

  if (loading) {
    return <div className="loading">Loading assignments...</div>;
  }

  return (
    <div className="assignments-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>
              {canCreateAssignments ? 'Assignment Management' : 
               canSubmitAssignments ? 'My Assignments' : 'Assignment Overview'}
            </h1>
            <p>
              {canCreateAssignments ? 'Create and manage assignments for your courses' :
               canSubmitAssignments ? 'View and submit your assignments' :
               'Review and grade student submissions'}
            </p>
          </div>
          {canCreateAssignments && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fas fa-plus"></i>
              Create Assignment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="assignments-filters">
        <div className="filters-row">
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

          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All Status</option>
              {canSubmitAssignments ? (
                <>
                  <option value="pending">Pending</option>
                  <option value="submitted">Submitted</option>
                  <option value="graded">Graded</option>
                  <option value="overdue">Overdue</option>
                </>
              ) : (
                <>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="closed">Closed</option>
                </>
              )}
            </select>
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            >
              <option value="dueDate">Due Date</option>
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
              <option value="course">Course</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="assignments-grid">
        {assignments.length > 0 ? (
          assignments.map(assignment => {
            const status = getAssignmentStatus(assignment);
            const isOverdue = new Date(assignment.dueDate) < new Date();
            const studentSubmission = assignment.submissions?.find(sub => sub.student === user._id);
            
            return (
              <div key={assignment._id} className={`assignment-card ${getStatusColor(status)}`}>
                <div className="assignment-header">
                  <div className="assignment-title-section">
                    <h3 className="assignment-title">{assignment.title}</h3>
                    <span className={`assignment-status ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                  <div className="assignment-course">
                    <i className="fas fa-book"></i>
                    {assignment.course?.name}
                  </div>
                </div>

                <div className="assignment-content">
                  <p className="assignment-description">{assignment.description}</p>
                  
                  <div className="assignment-meta">
                    <div className="meta-item">
                      <i className="fas fa-calendar-alt"></i>
                      <span>Due: {formatDate(assignment.dueDate)}</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-star"></i>
                      <span>{assignment.maxPoints} points</span>
                    </div>
                    <div className="meta-item">
                      <i className="fas fa-users"></i>
                      <span>{assignment.submissions?.length || 0} submissions</span>
                    </div>
                  </div>

                  {studentSubmission && (
                    <div className="student-submission-info">
                      <div className="submission-status">
                        <i className="fas fa-check-circle"></i>
                        Submitted on {formatDate(studentSubmission.submittedAt)}
                      </div>
                      {studentSubmission.grade !== undefined && (
                        <div className="submission-grade">
                          Grade: {studentSubmission.grade}/{assignment.maxPoints}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="assignment-actions">
                  {canSubmitAssignments && !studentSubmission && !isOverdue && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setSubmissionModal(true);
                      }}
                    >
                      <i className="fas fa-upload"></i>
                      Submit
                    </button>
                  )}
                  
                  {canSubmitAssignments && (
                    <button 
                      className="btn btn-outline"
                      onClick={() => navigate(`/assignments/${assignment._id}`)}
                    >
                      <i className="fas fa-eye"></i>
                      View Details
                    </button>
                  )}

                  {canCreateAssignments && (
                    <>
                      <button 
                        className="btn btn-outline"
                        onClick={() => navigate(`/assignments/${assignment._id}/submissions`)}
                      >
                        <i className="fas fa-list"></i>
                        View Submissions ({assignment.submissions?.length || 0})
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => navigate(`/assignments/${assignment._id}/edit`)}
                      >
                        <i className="fas fa-edit"></i>
                        Edit
                      </button>
                    </>
                  )}

                  {['faculty', 'ta'].includes(user?.role) && (
                    <button 
                      className="btn btn-info"
                      onClick={() => navigate(`/assignments/${assignment._id}/grade`)}
                    >
                      <i className="fas fa-clipboard-check"></i>
                      Grade
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <i className="fas fa-tasks"></i>
            <h3>No assignments found</h3>
            <p>
              {canCreateAssignments 
                ? "Create your first assignment to get started!"
                : "No assignments available at the moment."}
            </p>
            {canCreateAssignments && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Assignment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Assignment Modal */}
      {showCreateModal && canCreateAssignments && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Assignment</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">Assignment Title *</label>
                  <input
                    type="text"
                    id="title"
                    value={assignmentForm.title}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="courseId">Course *</label>
                  <select
                    id="courseId"
                    value={assignmentForm.courseId}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, courseId: e.target.value }))}
                    required
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course._id} value={course._id}>
                        {course.name} ({course.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description *</label>
                <textarea
                  id="description"
                  value={assignmentForm.description}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, description: e.target.value }))}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="instructions">Instructions</label>
                <textarea
                  id="instructions"
                  value={assignmentForm.instructions}
                  onChange={(e) => setAssignmentForm(prev => ({ ...prev, instructions: e.target.value }))}
                  rows="4"
                  placeholder="Detailed instructions for students..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dueDate">Due Date *</label>
                  <input
                    type="datetime-local"
                    id="dueDate"
                    value={assignmentForm.dueDate}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="maxPoints">Maximum Points *</label>
                  <input
                    type="number"
                    id="maxPoints"
                    value={assignmentForm.maxPoints}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, maxPoints: parseInt(e.target.value) }))}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="submissionType">Submission Type</label>
                  <select
                    id="submissionType"
                    value={assignmentForm.submissionType}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, submissionType: e.target.value }))}
                  >
                    <option value="both">Text and File</option>
                    <option value="text">Text Only</option>
                    <option value="file">File Only</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={assignmentForm.allowLateSubmission}
                      onChange={(e) => setAssignmentForm(prev => ({ ...prev, allowLateSubmission: e.target.checked }))}
                    />
                    Allow Late Submissions
                  </label>
                </div>
              </div>

              {assignmentForm.allowLateSubmission && (
                <div className="form-group">
                  <label htmlFor="latePenalty">Late Penalty (%)</label>
                  <input
                    type="number"
                    id="latePenalty"
                    value={assignmentForm.latePenalty}
                    onChange={(e) => setAssignmentForm(prev => ({ ...prev, latePenalty: parseInt(e.target.value) }))}
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Assignment Modal */}
      {submissionModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setSubmissionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Assignment: {selectedAssignment.title}</h3>
              <button 
                className="modal-close"
                onClick={() => setSubmissionModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="assignment-info">
                <p><strong>Course:</strong> {selectedAssignment.course?.name}</p>
                <p><strong>Due Date:</strong> {formatDate(selectedAssignment.dueDate)}</p>
                <p><strong>Points:</strong> {selectedAssignment.maxPoints}</p>
              </div>

              {(selectedAssignment.submissionType === 'text' || selectedAssignment.submissionType === 'both') && (
                <div className="form-group">
                  <label htmlFor="textSubmission">Text Submission</label>
                  <textarea
                    id="textSubmission"
                    value={submissionForm.textSubmission}
                    onChange={(e) => setSubmissionForm(prev => ({ ...prev, textSubmission: e.target.value }))}
                    rows="6"
                    placeholder="Enter your submission text here..."
                  />
                </div>
              )}

              {(selectedAssignment.submissionType === 'file' || selectedAssignment.submissionType === 'both') && (
                <div className="form-group">
                  <label htmlFor="files">File Upload</label>
                  <input
                    type="file"
                    id="files"
                    multiple
                    onChange={(e) => setSubmissionForm(prev => ({ ...prev, files: Array.from(e.target.files) }))}
                  />
                  <small className="form-help">
                    Maximum file size: 10MB per file
                  </small>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setSubmissionModal(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => handleSubmitAssignment(selectedAssignment._id)}
                >
                  Submit Assignment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;