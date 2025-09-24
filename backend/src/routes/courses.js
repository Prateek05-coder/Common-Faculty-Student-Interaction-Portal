const express = require('express');
const auth = require('../middleware/auth');
const {
  getCourses,
  createCourse,
  getMyCourses,
  getCourseById,
  getAvailableCourses,
  enrollInCourse,
  unenrollFromCourse,
  uploadCourseMaterial,
  uploadVideoLecture,
  getCourseMaterials,
  getVideoLectures,
  addScheduleItem,
  getCourseSchedule,
  assignTA,
  removeTA,
  debugCourseRelationships,
  runAccessControlFix,
  upload
} = require('../controllers/courseController');

const {
  getTeachingCourses,
  getEnrolledCourses, 
  getAssistingCourses
} = require('../controllers/courseSpecificController');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Basic course routes
router.post('/', createCourse);                     // POST /api/courses - Create course
router.get('/', getCourses);                        // GET /api/courses - Get all courses
router.get('/available', getAvailableCourses);      // GET /api/courses/available - Get available courses for enrollment
router.get('/my-courses', getMyCourses);            // GET /api/courses/my-courses - Get user's courses
router.get('/teaching', getTeachingCourses);        // GET /api/courses/teaching - Get teaching courses
router.get('/enrolled', getEnrolledCourses);        // GET /api/courses/enrolled - Get enrolled courses  
router.get('/assisting', getAssistingCourses);      // GET /api/courses/assisting - Get assisting courses

// Debug and fix routes (must come before /:id route)
router.post('/debug-relationships', debugCourseRelationships);  // POST /api/courses/debug-relationships - Debug course relationships
router.post('/fix-access-control', runAccessControlFix);       // POST /api/courses/fix-access-control - Fix access control issues

router.get('/:id', getCourseById);             // GET /api/courses/:id - Get course by ID
router.post('/:id/enroll', enrollInCourse);     // POST /api/courses/:id/enroll - Enroll in course
router.post('/:id/unenroll', unenrollFromCourse); // POST /api/courses/:id/unenroll - Unenroll from course

// Course materials routes
router.post('/:id/materials', upload.single('courseMaterial'), uploadCourseMaterial);  // Upload material
router.get('/:id/materials', getCourseMaterials);                                       // Get materials

// Video lectures routes  
router.post('/:id/videos', upload.single('courseVideo'), uploadVideoLecture);          // Upload video
router.get('/:id/videos', getVideoLectures);                                           // Get videos

// Schedule routes
router.post('/:id/schedule', addScheduleItem);                                         // Add schedule item
router.get('/:id/schedule', getCourseSchedule);                                        // Get schedule

// TA Management routes
router.post('/:id/assign-ta', assignTA);                                              // Assign TA to course
router.post('/:id/remove-ta', removeTA);                                              // Remove TA from course

module.exports = router;