const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// GET /api/maintenance - Get current resident's maintenance bills (Private)
router.get('/', authenticate, maintenanceController.getMyMaintenance);

// GET /api/maintenance/history - Get payment logs (Private)
router.get('/history', authenticate, maintenanceController.getPaymentHistory);

// GET /api/maintenance/all - Get all records (Private: Admin/Manager only)
router.get('/all', authenticate, authorize('admin', 'manager'), maintenanceController.getAllMaintenance);

// GET /api/maintenance/stats - Get stats (Private: Admin/Manager only)
router.get('/stats', authenticate, authorize('admin', 'manager'), maintenanceController.getMaintenanceStats);

// POST /api/maintenance/generate - Generate bills (Private: Admin/Manager only)
router.post('/generate', authenticate, authorize('admin', 'manager'), maintenanceController.generateMonthlyBills);

// POST /api/maintenance/simulate-pay/:id - Simulate payment (Private)
router.post('/simulate-pay/:id', authenticate, maintenanceController.simulatePayment);

// POST /api/maintenance/create-order - Create Razorpay order (Private)
router.post('/create-order', authenticate, maintenanceController.createRazorpayOrder);

// POST /api/maintenance/verify-payment - Verify Razorpay signature (Private)
router.post('/verify-payment', authenticate, maintenanceController.verifyRazorpayPayment);

module.exports = router;
