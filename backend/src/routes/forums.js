const express = require('express');
const auth = require('../middleware/auth');
const {
  createForumPost,
  getForumPosts,
  getForumPostById,
  addReplyToPost,
  getForumPostsByCourse,
  updateForumStatus
} = require('../controllers/forumController');

const router = express.Router();
router.use(auth);

router.post('/', createForumPost);
router.get('/', getForumPosts);
router.get('/:id', getForumPostById);
router.post('/:id/reply', addReplyToPost);
router.get('/course/:courseId', getForumPostsByCourse);
router.put('/:id/status', updateForumStatus);

module.exports = router;
