import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import toast from 'react-hot-toast';

const GradesPage = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');

  useEffect(() => {
    loadGrades();
    loadCourses();
  }, [selectedCourse, selectedSemester]);

  const loadGrades = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/assignments/my-grades`);
      setGrades(response.data.data || []);
    } catch (error) {
      console.error('Error loading grades:', error);
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/courses/enrolled`);
      setCourses(response.data.data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 90) return 'grade-a';
    if (percentage >= 80) return 'grade-b';
    if (percentage >= 70) return 'grade-c';
    if (percentage >= 60) return 'grade-d';
    return 'grade-f';
  };

  const getLetterGrade = (percentage) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const calculateCourseGPA = (courseGrades) => {
    if (courseGrades.length === 0) return 0;
    const totalPoints = courseGrades.reduce((sum, grade) => sum + (grade.percentage || 0), 0);
    return (totalPoints / courseGrades.length).toFixed(2);
  };

  const filteredGrades = grades.filter(grade => {
    const courseMatch = selectedCourse === 'all' || grade.course._id === selectedCourse;
    const semesterMatch = selectedSemester === 'all' || 
      `${grade.course.semester} ${grade.course.year}` === selectedSemester;
    return courseMatch && semesterMatch;
  });

  const groupedGrades = filteredGrades.reduce((acc, grade) => {
    const courseId = grade.course._id;
    if (!acc[courseId]) {
      acc[courseId] = {
        course: grade.course,
        assignments: []
      };
    }
    acc[courseId].assignments.push(grade);
    return acc;
  }, {});

  if (!['student'].includes(user?.role)) {
    return (
      <div className="error-page">
        <div className="error-content">
          <i className="fas fa-lock"></i>
          <h2>Access Denied</h2>
          <p>This page is only available to students.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grades-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading your grades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grades-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-info">
            <h1>My Grades</h1>
            <p>View your assignment grades and academic progress</p>
          </div>
        </div>
      </div>

      <div className="grades-content">
        {/* Filters */}
        <div className="grades-filters">
          <div className="filter-group">
            <label htmlFor="course-filter">Filter by Course:</label>
            <select
              id="course-filter"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="semester-filter">Filter by Semester:</label>
            <select
              id="semester-filter"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
            >
              <option value="all">All Semesters</option>
              {[...new Set(courses.map(course => `${course.semester} ${course.year}`))].map(semester => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grades-overview">
          <div className="overview-cards">
            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <div className="card-info">
                <h3>
                  {filteredGrades.length > 0 
                    ? (filteredGrades.reduce((sum, g) => sum + (g.percentage || 0), 0) / filteredGrades.length).toFixed(1)
                    : '0.0'
                  }%
                </h3>
                <p>Overall Average</p>
              </div>
            </div>

            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-tasks"></i>
              </div>
              <div className="card-info">
                <h3>{filteredGrades.length}</h3>
                <p>Graded Assignments</p>
              </div>
            </div>

            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-trophy"></i>
              </div>
              <div className="card-info">
                <h3>
                  {filteredGrades.length > 0 
                    ? getLetterGrade(filteredGrades.reduce((sum, g) => sum + (g.percentage || 0), 0) / filteredGrades.length)
                    : 'N/A'
                  }
                </h3>
                <p>Letter Grade</p>
              </div>
            </div>

            <div className="overview-card">
              <div className="card-icon">
                <i className="fas fa-star"></i>
              </div>
              <div className="card-info">
                <h3>{filteredGrades.filter(g => (g.percentage || 0) >= 90).length}</h3>
                <p>A Grades</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grades by Course */}
        <div className="grades-by-course">
          {Object.keys(groupedGrades).length > 0 ? (
            Object.values(groupedGrades).map(courseData => {
              const courseAverage = calculateCourseGPA(courseData.assignments);
              
              return (
                <div key={courseData.course._id} className="course-grades-card">
                  <div className="course-header">
                    <div className="course-info">
                      <h3>{courseData.course.code} - {courseData.course.name}</h3>
                      <p>
                        <span className="faculty-name">
                          <i className="fas fa-chalkboard-teacher"></i>
                          {courseData.course.faculty?.name}
                        </span>
                        <span className="semester">
                          <i className="fas fa-calendar"></i>
                          {courseData.course.semester} {courseData.course.year}
                        </span>
                      </p>
                    </div>
                    
                    <div className="course-average">
                      <div className={`grade-display ${getGradeColor(courseAverage)}`}>
                        <span className="percentage">{courseAverage}%</span>
                        <span className="letter">{getLetterGrade(courseAverage)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="assignments-grades">
                    <div className="grades-table">
                      <div className="table-header">
                        <div className="header-cell">Assignment</div>
                        <div className="header-cell">Due Date</div>
                        <div className="header-cell">Score</div>
                        <div className="header-cell">Grade</div>
                        <div className="header-cell">Feedback</div>
                      </div>

                      {courseData.assignments.map(grade => (
                        <div key={grade._id} className="table-row">
                          <div className="cell assignment-title">
                            <strong>{grade.assignment.title}</strong>
                          </div>
                          
                          <div className="cell due-date">
                            {new Date(grade.assignment.dueDate).toLocaleDateString()}
                          </div>
                          
                          <div className="cell score">
                            {grade.score || 0} / {grade.assignment.maxPoints}
                          </div>
                          
                          <div className="cell grade">
                            <span className={`grade-badge ${getGradeColor(grade.percentage || 0)}`}>
                              {grade.percentage ? grade.percentage.toFixed(1) : '0.0'}%
                            </span>
                          </div>
                          
                          <div className="cell feedback">
                            {grade.feedback ? (
                              <div className="feedback-content">
                                <i className="fas fa-comment"></i>
                                <span>{grade.feedback}</span>
                              </div>
                            ) : (
                              <span className="no-feedback">No feedback</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <i className="fas fa-clipboard-list"></i>
              <h3>No Grades Available</h3>
              <p>
                {selectedCourse !== 'all' || selectedSemester !== 'all' 
                  ? 'No grades found for the selected filters.'
                  : 'You don\'t have any graded assignments yet.'}
              </p>
            </div>
          )}
        </div>

        {/* Grade Distribution Chart */}
        {filteredGrades.length > 0 && (
          <div className="grade-distribution">
            <h2>Grade Distribution</h2>
            <div className="distribution-chart">
              {['A', 'B', 'C', 'D', 'F'].map(letter => {
                const count = filteredGrades.filter(g => getLetterGrade(g.percentage || 0) === letter).length;
                const percentage = (count / filteredGrades.length) * 100;
                
                return (
                  <div key={letter} className="grade-bar">
                    <div className="bar-header">
                      <span className="grade-letter">{letter}</span>
                      <span className="grade-count">{count}</span>
                    </div>
                    <div className="bar-container">
                      <div 
                        className={`bar-fill grade-${letter.toLowerCase()}`}
                        style={{ height: `${Math.max(percentage, 5)}%` }}
                      ></div>
                    </div>
                    <div className="bar-percentage">
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GradesPage;
