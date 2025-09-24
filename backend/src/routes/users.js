const express = require('express');
const auth = require('../middleware/auth');
const {
  updateMyProfile,
  changePassword,
  getMyProfile,
  getDashboardStats,
  searchUsers,
  getAllUsers
} = require('../controllers/userController');

const router = express.Router();
router.use(auth);

router.get('/', getAllUsers);                    // GET /api/users - Get all users
router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.post('/change-password', changePassword);
router.get('/dashboard-stats', getDashboardStats);
router.get('/search', searchUsers);

module.exports = router;
