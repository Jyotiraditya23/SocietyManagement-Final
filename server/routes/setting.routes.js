const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication and Admin/Manager authorization
router.use(authenticate);
router.use(authorize('manager', 'admin'));

// GET /api/settings - View settings
router.get('/', settingController.getSettings);

// PUT /api/settings - Update setting
router.put('/', settingController.updateSetting);

module.exports = router;
