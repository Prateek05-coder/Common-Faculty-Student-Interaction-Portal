import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const GradingPage = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    grade: '',
    feedback: ''
  });

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/assignments`);
      const assignmentsData = response.data.data || [];
      
      // Filter assignments that have submissions to grade
      const assignmentsWithSubmissions = assignmentsData.filter(assignment => 
        assignment.submissions && assignment.submissions.length > 0
      );
      
      setAssignments(assignmentsWithSubmissions);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (assignmentId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/assignments/${assignmentId}`);
      const assignment = response.data.data;
      
      if (assignment && assignment.submissions) {
        setSubmissions(assignment.submissions);
        setSelectedAssignment(assignment);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('Failed to load submissions');
    }
  };

  const handleGradeSubmission = async (e) => {
    e.preventDefault();
    
    if (!gradeForm.grade || gradeForm.grade < 0 || gradeForm.grade > selectedAssignment.maxPoints) {
      toast.error(`Grade must be between 0 and ${selectedAssignment.maxPoints}`);
      return;
    }

    setGrading(true);
    
    try {
      await axios.post(
        `${process.env.REACT_APP_API_URL}/assignments/${selectedAssignment._id}/grade/${selectedSubmission.student._id}`,
        {
          grade: parseFloat(gradeForm.grade),
          feedback: gradeForm.feedback
        }
      );

      toast.success('Assignment graded successfully!');
      
      // Update the submission in the list
      setSubmissions(prev => prev.map(sub => 
        sub.student._id === selectedSubmission.student._id 
          ? { ...sub, grade: parseFloat(gradeForm.grade), feedback: gradeForm.feedback, isGraded: true }
          : sub
      ));
      
      // Reset form and close modal
      setGradeForm({ grade: '', feedback: '' });
      setSelectedSubmission(null);
      
    } catch (error) {
      console.error('Error grading assignment:', error);
      toast.error('Failed to grade assignment');
    } finally {
      setGrading(false);
    }
  };

  const openGradingModal = (submission) => {
    setSelectedSubmission(submission);
    setGradeForm({
      grade: submission.grade || '',
      feedback: submission.feedback || ''
    });
  };

  if (!['faculty', 'ta', 'admin'].includes(user?.role)) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-lock"></i>
          <h2>Access Denied</h2>
          <p>This page is only available to faculty and teaching assistants.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grading-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grading-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Assignment Grading</h1>
            <p>Grade student submissions and provide feedback</p>
          </div>
        </div>
      </div>

      <div className="grading-content">
        {!selectedAssignment ? (
          // Assignment List View
          <div className="assignments-list">
            <h2>Assignments with Submissions</h2>
            {assignments.length > 0 ? (
              <div className="assignments-grid">
                {assignments.map(assignment => {
                  const ungradedCount = assignment.submissions.filter(sub => !sub.isGraded).length;
                  const totalSubmissions = assignment.submissions.length;
                  
                  return (
                    <div 
                      key={assignment._id} 
                      className="assignment-card"
                      onClick={() => loadSubmissions(assignment._id)}
                    >
                      <div className="assignment-header">
                        <h3>{assignment.title}</h3>
                        <span className="course-name">{assignment.course?.name}</span>
                      </div>
                      
                      <div className="assignment-stats">
                        <div className="stat">
                          <span className="stat-number">{totalSubmissions}</span>
                          <span className="stat-label">Total Submissions</span>
                        </div>
                        <div className="stat">
                          <span className="stat-number ungraded">{ungradedCount}</span>
                          <span className="stat-label">Ungraded</span>
                        </div>
                        <div className="stat">
                          <span className="stat-number graded">{totalSubmissions - ungradedCount}</span>
                          <span className="stat-label">Graded</span>
                        </div>
                      </div>
                      
                      <div className="assignment-progress">
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${totalSubmissions > 0 ? ((totalSubmissions - ungradedCount) / totalSubmissions) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="progress-text">
                          {totalSubmissions > 0 ? Math.round(((totalSubmissions - ungradedCount) / totalSubmissions) * 100) : 0}% Graded
                        </span>
                      </div>
                      
                      <div className="assignment-meta">
                        <span className="due-date">
                          <i className="fas fa-calendar"></i>
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                        <span className="max-points">
                          <i className="fas fa-star"></i>
                          {assignment.maxPoints} points
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <i className="fas fa-clipboard-list"></i>
                <h3>No Submissions to Grade</h3>
                <p>There are no assignment submissions available for grading at this time.</p>
              </div>
            )}
          </div>
        ) : (
          // Submissions List View
          <div className="submissions-view">
            <div className="submissions-header">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedAssignment(null);
                  setSubmissions([]);
                }}
              >
                <i className="fas fa-arrow-left"></i>
                Back to Assignments
              </button>
              
              <div className="assignment-info">
                <h2>{selectedAssignment.title}</h2>
                <p>{selectedAssignment.course?.name} • {selectedAssignment.maxPoints} points</p>
              </div>
            </div>

            <div className="submissions-list">
              {submissions.length > 0 ? (
                <div className="submissions-table">
                  <div className="table-header">
                    <div className="header-cell">Student</div>
                    <div className="header-cell">Submitted</div>
                    <div className="header-cell">Grade</div>
                    <div className="header-cell">Status</div>
                    <div className="header-cell">Actions</div>
                  </div>
                  
                  {submissions.map(submission => (
                    <div key={submission.student._id} className="table-row">
                      <div className="cell student-info">
                        <div className="student-name">{submission.student.name}</div>
                        <div className="student-email">{submission.student.email}</div>
                      </div>
                      
                      <div className="cell">
                        {new Date(submission.submittedAt).toLocaleString()}
                      </div>
                      
                      <div className="cell">
                        {submission.isGraded ? (
                          <span className="grade-display">
                            {submission.grade}/{selectedAssignment.maxPoints}
                          </span>
                        ) : (
                          <span className="no-grade">Not graded</span>
                        )}
                      </div>
                      
                      <div className="cell">
                        <span className={`status-badge ${submission.isGraded ? 'graded' : 'pending'}`}>
                          {submission.isGraded ? 'Graded' : 'Pending'}
                        </span>
                      </div>
                      
                      <div className="cell actions">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => openGradingModal(submission)}
                        >
                          {submission.isGraded ? 'Edit Grade' : 'Grade'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-inbox"></i>
                  <h3>No Submissions</h3>
                  <p>No students have submitted this assignment yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {selectedSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="modal-content grading-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Grade Submission</h2>
              <button 
                className="modal-close"
                onClick={() => setSelectedSubmission(null)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="student-info">
                <h3>{selectedSubmission.student.name}</h3>
                <p>{selectedSubmission.student.email}</p>
                <p>Submitted: {new Date(selectedSubmission.submittedAt).toLocaleString()}</p>
              </div>

              <div className="submission-content">
                {selectedSubmission.textSubmission && (
                  <div className="text-submission">
                    <h4>Text Submission:</h4>
                    <div className="submission-text">
                      {selectedSubmission.textSubmission}
                    </div>
                  </div>
                )}

                {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                  <div className="file-submissions">
                    <h4>File Submissions:</h4>
                    <div className="files-list">
                      {selectedSubmission.files.map((file, index) => (
                        <div key={index} className="file-item">
                          <i className="fas fa-file"></i>
                          <span>{file.originalName}</span>
                          <a 
                            href={file.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleGradeSubmission} className="grading-form">
                <div className="form-group">
                  <label htmlFor="grade">Grade (out of {selectedAssignment.maxPoints})</label>
                  <input
                    type="number"
                    id="grade"
                    min="0"
                    max={selectedAssignment.maxPoints}
                    step="0.1"
                    value={gradeForm.grade}
                    onChange={(e) => setGradeForm(prev => ({ ...prev, grade: e.target.value }))}
                    required
                    disabled={grading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="feedback">Feedback (Optional)</label>
                  <textarea
                    id="feedback"
                    rows="4"
                    value={gradeForm.feedback}
                    onChange={(e) => setGradeForm(prev => ({ ...prev, feedback: e.target.value }))}
                    placeholder="Provide feedback to the student..."
                    disabled={grading}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setSelectedSubmission(null)}
                    disabled={grading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={grading}
                  >
                    {grading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Grading...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Save Grade
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingPage;
