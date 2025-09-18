const express = require('express');
const auth = require('../middleware/auth');
const {
  getCourses,
  createCourse,
  getMyCourses,
  getCourseById,
  uploadCourseMaterial,
  uploadVideoLecture,
  getCourseMaterials,
  getVideoLectures,
  addScheduleItem,
  getCourseSchedule,
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
router.get('/', getCourses);                    // GET /api/courses - Get all courses for user
router.post('/', createCourse);                // POST /api/courses - Create new course
router.get('/my-courses', getMyCourses);        // GET /api/courses/my-courses - Get user's courses for dropdown
router.get('/teaching', getTeachingCourses);      // GET /api/courses/teaching
router.get('/enrolled', getEnrolledCourses);      // GET /api/courses/enrolled  
router.get('/assisting', getAssistingCourses);    // GET /api/courses/assisting
router.get('/:id', getCourseById);             // GET /api/courses/:id - Get course by ID

// Course materials routes
router.post('/:id/materials', upload.single('courseMaterial'), uploadCourseMaterial);  // Upload material
router.get('/:id/materials', getCourseMaterials);                                       // Get materials

// Video lectures routes  
router.post('/:id/videos', upload.single('courseVideo'), uploadVideoLecture);          // Upload video
router.get('/:id/videos', getVideoLectures);                                           // Get videos

// Schedule routes
router.post('/:id/schedule', addScheduleItem);                                         // Add schedule item
router.get('/:id/schedule', getCourseSchedule);                                        // Get schedule

module.exports = router;