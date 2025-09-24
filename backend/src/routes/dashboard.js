const express = require('express');
const auth = require('../middleware/auth');
const {
  getFacultyStats,
  getStudentStats,
  getTAStats,
  getAdminStats
} = require('../controllers/dashboardController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// Test endpoint to verify dashboard API is working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard API is working',
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    },
    timestamp: new Date().toISOString()
  });
});

// Dashboard statistics routes
router.get('/faculty-stats', getFacultyStats);   // GET /api/dashboard/faculty-stats
router.get('/student-stats', getStudentStats);   // GET /api/dashboard/student-stats  
router.get('/ta-stats', getTAStats);             // GET /api/dashboard/ta-stats
router.get('/admin-stats', getAdminStats);       // GET /api/dashboard/admin-stats

module.exports = router;