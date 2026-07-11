const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/notice.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);

// GET /api/notices - View notices
router.get('/', noticeController.getNotices);

// POST /api/notices - Create notice (Manager, Admin only)
router.post('/', authorize('manager', 'admin'), noticeController.createNotice);

// DELETE /api/notices/:id - Delete notice (Manager, Admin only)
router.delete('/:id', authorize('manager', 'admin'), noticeController.deleteNotice);

module.exports = router;
