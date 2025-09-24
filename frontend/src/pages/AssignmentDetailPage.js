import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const AssignmentDetailPage = () => {
  const { assignmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    textSubmission: '',
    files: []
  });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [gradingForm, setGradingForm] = useState({
    grade: '',
    feedback: ''
  });

  const loadAssignmentData = useCallback(async () => {
    if (!assignmentId) return;
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/assignments/${assignmentId}`);
      setAssignment(response.data.data);
    } catch (error) {
      console.error('Error loading assignment:', error);
      if (error.response?.status === 404) {
        toast.error('Assignment not found');
        navigate('/assignments');
      } else {
        toast.error('Failed to load assignment');
      }
    } finally {
      setLoading(false);
    }
  }, [assignmentId, navigate]);

  const loadSubmissionsData = useCallback(async () => {
    if (!assignmentId) return;
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/assignments/${assignmentId}/submissions`);
      setSubmissions(response.data.data.submissions || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadAssignmentData();
    if (['faculty', 'ta', 'admin'].includes(user?.role)) {
      loadSubmissionsData();
    }
  }, [loadAssignmentData, loadSubmissionsData, user?.role]);


  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Starting assignment submission...');
    console.log('Assignment ID:', assignmentId);
    console.log('API URL:', process.env.REACT_APP_API_URL);
    console.log('Submission form:', submissionForm);
    
    // Validate submission
    if (!submissionForm.textSubmission.trim() && submissionForm.files.length === 0) {
      toast.error('Please provide either text submission or upload files');
      return;
    }
    
    const formData = new FormData();
    formData.append('textSubmission', submissionForm.textSubmission);
    
    submissionForm.files.forEach((file, index) => {
      console.log(`Adding file ${index}:`, file.name, file.size);
      formData.append('files', file);
    });

    try {
      console.log('📤 Sending request to:', `${process.env.REACT_APP_API_URL}/api/assignments/${assignmentId}/submit`);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/assignments/${assignmentId}/submit`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log('✅ Submission successful:', response.data);
      toast.success('Assignment submitted successfully!');
      setShowSubmissionModal(false);
      setSubmissionForm({ textSubmission: '', files: [] });
      loadAssignmentData();

    } catch (error) {
      console.error('❌ Submission error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 'Failed to submit assignment';
      toast.error(errorMessage);
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(
        `${process.env.REACT_APP_API_URL}/assignments/${assignmentId}/submissions/${selectedSubmission._assignmentId}/grade`,
        gradingForm
      );

      toast.success('Assignment graded successfully!');
      setShowGradingModal(false);
      setSelectedSubmission(null);
      setGradingForm({ grade: '', feedback: '' });
      loadSubmissionsData();

    } catch (error) {
      console.error('Error grading submission:', error);
      toast.error('Failed to grade submission');
    }
  };

  const openGradingModal = (submission) => {
    setSelectedSubmission(submission);
    setGradingForm({
      grade: submission.grade || '',
      feedback: submission.feedback || ''
    });
    setShowGradingModal(true);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  };

  const getSubmissionStatus = () => {
    if (user.role === 'student') {
      if (assignment?.userSubmission) {
        return assignment.userSubmission.status === 'graded' ? 'graded' : 'submitted';
      }
      return new Date(assignment?.dueDate) < new Date() ? 'overdue' : 'pending';
    }
    return assignment?.status;
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

  if (loading) {
    return <div className="loading">Loading assignment...</div>;
  }

  if (!assignment) {
    return (
      <div className="error-state">
        <h2>Assignment not found</h2>
        <button onClick={() => navigate('/assignments')} className="btn btn-primary">
          Back to Assignments
        </button>
      </div>
    );
  }

  const status = getSubmissionStatus();
  const isOverdue = new Date(assignment.dueDate) < new Date();
  const canSubmit = user.role === 'student' && !assignment.userSubmission && 
                   (!isOverdue || assignment.allowLateSubmission);
  const canGrade = ['faculty', 'ta'].includes(user?.role);

  return (
    <div className="assignment-detail-page">
      <div className="assignment-detail-header">
        <button 
          onClick={() => navigate('/assignments')} 
          className="back-btn"
        >
          <i className="fas fa-arrow-left"></i>
          Back to Assignments
        </button>

        <div className="header-actions">
          {user.role === 'faculty' && (
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/assignments/${assignmentId}/edit`)}
            >
              <i className="fas fa-edit"></i>
              Edit Assignment
            </button>
          )}
          
          {canGrade && (
            <button 
              className="btn btn-info"
              onClick={() => navigate(`/assignments/${assignmentId}/submissions`)}
            >
              <i className="fas fa-list"></i>
              View All Submissions
            </button>
          )}
        </div>
      </div>

      <div className="assignment-detail-content">
        {/* Assignment Info */}
        <div className="assignment-info-section">
          <div className="assignment-header">
            <div className="assignment-title-section">
              <h1>{assignment.title}</h1>
              <span className={`status-badge ${getStatusColor(status)}`}>
                {status}
              </span>
            </div>
            
            <div className="assignment-meta">
              <div className="meta-item">
                <i className="fas fa-book"></i>
                <span>{assignment.course?.name}</span>
              </div>
              <div className="meta-item">
                <i className="fas fa-calendar-alt"></i>
                <span>Due: {formatDate(assignment.dueDate)}</span>
              </div>
              <div className="meta-item">
                <i className="fas fa-star"></i>
                <span>{assignment.maxPoints} points</span>
              </div>
              <div className="meta-item">
                <i className="fas fa-chalkboard-teacher"></i>
                <span>{assignment.faculty?.name}</span>
              </div>
            </div>
          </div>

          <div className="assignment-description">
            <h2>Description</h2>
            <p>{assignment.description}</p>
          </div>

          {assignment.instructions && (
            <div className="assignment-instructions">
              <h2>Instructions</h2>
              <div className="instructions-content">
                {assignment.instructions.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {assignment.attachments && assignment.attachments.length > 0 && (
            <div className="assignment-attachments">
              <h2>Attachments</h2>
              <div className="attachments-list">
                {assignment.attachments.map((attachment, index) => (
                  <div key={index} className="attachment-item">
                    <div className="attachment-info">
                      <i className="fas fa-paperclip"></i>
                      <span className="attachment-name">{attachment.originalName}</span>
                      <span className="attachment-size">
                        ({formatFileSize(attachment.size)})
                      </span>
                    </div>
                    <a 
                      href={`${process.env.REACT_APP_API_URL}${attachment.url}`}
                      download
                      className="download-btn"
                    >
                      <i className="fas fa-download"></i>
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignment.rubric && assignment.rubric.length > 0 && (
            <div className="assignment-rubric">
              <h2>Grading Rubric</h2>
              <div className="rubric-table">
                <table>
                  <thead>
                    <tr>
                      <th>Criteria</th>
                      <th>Points</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignment.rubric.map((criteria, index) => (
                      <tr key={index}>
                        <td>{criteria.criteria}</td>
                        <td>{criteria.points}</td>
                        <td>{criteria.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Student Submission Section */}
        {user.role === 'student' && (
          <div className="submission-section">
            <h2>Your Submission</h2>
            
            {assignment.userSubmission ? (
              <div className="existing-submission">
                <div className="submission-status">
                  <i className="fas fa-check-circle"></i>
                  <span>Submitted on {formatDate(assignment.userSubmission.submittedAt)}</span>
                  {assignment.userSubmission.isLate && (
                    <span className="late-badge">Late</span>
                  )}
                </div>

                {assignment.userSubmission.textSubmission && (
                  <div className="submission-text">
                    <h3>Text Submission</h3>
                    <div className="text-content">
                      {assignment.userSubmission.textSubmission}
                    </div>
                  </div>
                )}

                {assignment.userSubmission.files && assignment.userSubmission.files.length > 0 && (
                  <div className="submission-files">
                    <h3>Submitted Files</h3>
                    <div className="files-list">
                      {assignment.userSubmission.files.map((file, index) => (
                        <div key={index} className="file-item">
                          <i className="fas fa-file"></i>
                          <span className="file-name">{file.originalName}</span>
                          <span className="file-size">({formatFileSize(file.size)})</span>
                          <a 
                            href={`${process.env.REACT_APP_API_URL}${file.url}`}
                            download
                            className="download-link"
                          >
                            <i className="fas fa-download"></i>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assignment.userSubmission.status === 'graded' && (
                  <div className="submission-grade">
                    <div className="grade-display">
                      <h3>Grade</h3>
                      <div className="grade-value">
                        {assignment.userSubmission.grade}/{assignment.maxPoints}
                        {assignment.userSubmission.latePenaltyApplied > 0 && (
                          <span className="penalty-note">
                            (Late penalty: -{assignment.userSubmission.latePenaltyApplied} points)
                          </span>
                        )}
                      </div>
                    </div>

                    {assignment.userSubmission.feedback && (
                      <div className="grade-feedback">
                        <h3>Feedback</h3>
                        <p>{assignment.userSubmission.feedback}</p>
                      </div>
                    )}

                    <div className="graded-by">
                      Graded by {assignment.userSubmission.gradedBy?.name} on{' '}
                      {formatDate(assignment.userSubmission.gradedAt)}
                    </div>
                  </div>
                )}
              </div>
            ) : canSubmit ? (
              <div className="submission-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowSubmissionModal(true)}
                >
                  <i className="fas fa-upload"></i>
                  Submit Assignment
                </button>
                {isOverdue && assignment.allowLateSubmission && (
                  <div className="late-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    This assignment is overdue. Late penalty: {assignment.latePenalty}%
                  </div>
                )}
              </div>
            ) : (
              <div className="submission-unavailable">
                <i className="fas fa-times-circle"></i>
                <span>
                  {isOverdue 
                    ? 'Submission deadline has passed'
                    : 'Assignment not available for submission'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Faculty/TA Submissions Overview */}
        {canGrade && (
          <div className="submissions-overview">
            <div className="overview-header">
              <h2>Submissions Overview</h2>
              <div className="overview-stats">
                <div className="stat-item">
                  <span className="stat-number">{submissions.length}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {submissions.filter(s => s.status === 'submitted').length}
                  </span>
                  <span className="stat-label">Pending</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">
                    {submissions.filter(s => s.status === 'graded').length}
                  </span>
                  <span className="stat-label">Graded</span>
                </div>
              </div>
            </div>

            <div className="submissions-list">
              {submissions.length > 0 ? (
                submissions.map((submission) => (
                  <div key={submission._assignmentId} className="submission-item">
                    <div className="submission-student">
                      <div className="student-avatar">
                        {submission.student?.avatar ? (
                          <img src={submission.student.avatar} alt={submission.student.name} />
                        ) : (
                          <div className="avatar-placeholder">
                            {submission.student?.name?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="student-info">
                        <span className="student-name">{submission.student?.name}</span>
                        <span className="student-email">{submission.student?.email}</span>
                      </div>
                    </div>

                    <div className="submission-details">
                      <div className="submission-date">
                        Submitted: {formatDate(submission.submittedAt)}
                        {submission.isLate && <span className="late-badge">Late</span>}
                      </div>
                      
                      <div className={`submission-status ${submission.status}`}>
                        {submission.status === 'graded' ? (
                          <span>Graded: {submission.grade}/{assignment.maxPoints}</span>
                        ) : (
                          <span>Pending Review</span>
                        )}
                      </div>
                    </div>

                    <div className="submission-actions">
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/assignments/${assignmentId}/submissions/${submission._assignmentId}`)}
                      >
                        <i className="fas fa-eye"></i>
                        View
                      </button>
                      
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => openGradingModal(submission)}
                      >
                        <i className="fas fa-clipboard-check"></i>
                        {submission.status === 'graded' ? 'Regrade' : 'Grade'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-submissions">
                  <i className="fas fa-inbox"></i>
                  <p>No submissions yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Assignment Modal */}
      {showSubmissionModal && (
        <div className="modal-overlay" onClick={() => setShowSubmissionModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submit Assignment: {assignment.title}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowSubmissionModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitAssignment} className="modal-body">
              <div className="assignment-summary">
                <p><strong>Course:</strong> {assignment.course?.name}</p>
                <p><strong>Due Date:</strong> {formatDate(assignment.dueDate)}</p>
                <p><strong>Points:</strong> {assignment.maxPoints}</p>
              </div>

              {(assignment.submissionType === 'text' || assignment.submissionType === 'both') && (
                <div className="form-group">
                  <label htmlFor="textSubmission">Text Submission</label>
                  <textarea
                    id="textSubmission"
                    value={submissionForm.textSubmission}
                    onChange={(e) => setSubmissionForm(prev => ({ 
                      ...prev, 
                      textSubmission: e.target.value 
                    }))}
                    rows="8"
                    placeholder="Enter your submission text here..."
                  />
                </div>
              )}

              {(assignment.submissionType === 'file' || assignment.submissionType === 'both') && (
                <div className="form-group">
                  <label htmlFor="files">File Upload</label>
                  <input
                    type="file"
                    id="files"
                    multiple
                    onChange={(e) => setSubmissionForm(prev => ({ 
                      ...prev, 
                      files: Array.from(e.target.files) 
                    }))}
                  />
                  <small className="form-help">
                    Maximum file size: {Math.round(assignment.maxFileSize / (1024 * 1024))}MB per file
                    {assignment.allowedFileTypes && assignment.allowedFileTypes.length > 0 && (
                      <span>. Allowed types: {assignment.allowedFileTypes.join(', ')}</span>
                    )}
                  </small>
                  
                  {submissionForm.files.length > 0 && (
                    <div className="selected-files">
                      <h4>Selected Files:</h4>
                      <ul>
                        {Array.from(submissionForm.files).map((file, index) => (
                          <li key={index}>
                            {file.name} ({formatFileSize(file.size)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowSubmissionModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  <i className="fas fa-upload"></i>
                  Submit Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {showGradingModal && selectedSubmission && (
        <div className="modal-overlay" onClick={() => setShowGradingModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Grade Submission - {selectedSubmission.student?.name}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowGradingModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleGradeSubmission} className="modal-body">
              <div className="submission-info">
                <p><strong>Student:</strong> {selectedSubmission.student?.name}</p>
                <p><strong>Submitted:</strong> {formatDate(selectedSubmission.submittedAt)}</p>
                {selectedSubmission.isLate && (
                  <p className="late-warning">
                    <i className="fas fa-exclamation-triangle"></i>
                    Late submission (Penalty: {assignment.latePenalty}%)
                  </p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="grade">Grade (out of {assignment.maxPoints})</label>
                <input
                  type="number"
                  id="grade"
                  value={gradingForm.grade}
                  onChange={(e) => setGradingForm(prev => ({ 
                    ...prev, 
                    grade: e.target.value 
                  }))}
                  min="0"
                  max={assignment.maxPoints}
                  step="0.5"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="feedback">Feedback</label>
                <textarea
                  id="feedback"
                  value={gradingForm.feedback}
                  onChange={(e) => setGradingForm(prev => ({ 
                    ...prev, 
                    feedback: e.target.value 
                  }))}
                  rows="4"
                  placeholder="Provide feedback to the student..."
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowGradingModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  <i className="fas fa-check"></i>
                  Submit Grade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetailPage;