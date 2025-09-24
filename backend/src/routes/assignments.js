const express = require('express');
const auth = require('../middleware/auth');
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  submitAssignment,
  gradeSubmission,
  getMyGrades,
  upload
} = require('../controllers/assignmentController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Assignment CRUD routes
router.post('/', createAssignment);                      // POST /api/assignments - Create assignment
router.get('/', getAssignments);                        // GET /api/assignments - Get all assignments

// Student grades (must come before /:id route)
router.get('/my-grades', getMyGrades);                                      // GET /api/assignments/my-grades - Get student's grades

router.get('/:id', getAssignmentById);                  // GET /api/assignments/:id - Get assignment by ID

// Assignment submission and grading
router.post('/:id/submit', upload.array('files', 5), submitAssignment);    // POST /api/assignments/:id/submit - Submit assignment
router.post('/:id/grade/:studentId', gradeSubmission);                     // POST /api/assignments/:id/grade/:studentId - Grade submission

module.exports = router;