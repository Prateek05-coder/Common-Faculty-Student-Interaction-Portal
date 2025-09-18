const express = require('express');
const auth = require('../middleware/auth');
const {
  updateMyProfile,
  changePassword,
  getMyProfile,
  getDashboardStats,
  searchUsers
} = require('../controllers/userController');

const router = express.Router();
router.use(auth);

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);
router.post('/change-password', changePassword);
router.get('/dashboard-stats', getDashboardStats);
router.get('/search', searchUsers);

module.exports = router;
