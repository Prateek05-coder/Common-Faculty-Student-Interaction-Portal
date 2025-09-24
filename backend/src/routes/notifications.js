const express = require('express');
const auth = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');

const router = express.Router();
router.use(auth);

router.get('/', getNotifications);                    // GET /api/notifications
router.put('/:id/read', markAsRead);                  // PUT /api/notifications/:id/read
router.put('/mark-all-read', markAllAsRead);          // PUT /api/notifications/mark-all-read
router.delete('/:id', deleteNotification);           // DELETE /api/notifications/:id

module.exports = router;
