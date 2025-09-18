const express = require('express');
const auth = require('../middleware/auth');
const {
  getNotifications,
  markNotificationsAsRead
} = require('../controllers/notificationController');

const router = express.Router();
router.use(auth);

router.get('/', getNotifications);                    // GET /api/notifications
router.post('/mark-read', markNotificationsAsRead);   // POST /api/notifications/mark-read

module.exports = router;
