const express = require('express');
const {
  getCalendarEvents,
  createCalendarEvent
} = require('../controllers/calendarController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/events', getCalendarEvents);
router.post('/events', createCalendarEvent);

module.exports = router;
