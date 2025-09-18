const express = require('express');
const {
  getStats,
  getSystemHealth,
  getActivity,
  getRecentUsers,
  getUsers,
  toggleUserStatus
} = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

router.use(auth);
router.use(requireAdmin);
router.get('/stats', getStats);
router.get('/system-health', getSystemHealth);
router.get('/activity', getActivity);
router.get('/recent-users', getRecentUsers);
router.get('/users', getUsers);
router.put('/users/:id/toggle-status', toggleUserStatus);

module.exports = router;