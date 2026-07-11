const Maintenance = require('../models/Maintenance');
const PaymentLog = require('../models/PaymentLog');
const User = require('../models/User');
const razorpay = require('../config/razorpay');

// @desc    Get current resident's maintenance bills
// @route   GET /api/maintenance
// @access  Private (Resident)
exports.getMyMaintenance = async (req, res, next) => {
  try {
    const maintenance = await Maintenance.find({ user_id: req.user._id })
      .sort({ year: -1, month: -1 });

    res.status(200).json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current resident's payment history logs
// @route   GET /api/maintenance/history
// @access  Private (Resident)
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const logs = await PaymentLog.find({ user_id: req.user._id })
      .sort({ payment_date: -1 });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all maintenance records (Admin/Manager only)
// @route   GET /api/maintenance/all
// @access  Private (Admin/Manager)
exports.getAllMaintenance = async (req, res, next) => {
  try {
    const maintenance = await Maintenance.find()
      .populate('user_id', 'name email phone')
      .sort({ year: -1, month: -1, flat_no: 1 });

    res.status(200).json({
      success: true,
      data: maintenance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get maintenance stats (Admin/Manager only)
// @route   GET /api/maintenance/stats
// @access  Private (Admin/Manager)
exports.getMaintenanceStats = async (req, res, next) => {
  try {
    const records = await Maintenance.find();
    
    let totalCollected = 0;
    let pendingAmount = 0;
    let overdueCount = 0;

    records.forEach(r => {
      if (r.status === 'paid') {
        totalCollected += r.total_amount;
      } else {
        pendingAmount += r.total_amount;
        if (r.status === 'overdue') {
          overdueCount++;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalCollected,
        pendingAmount,
        overdueCount,
        totalRecords: records.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate monthly bills for all residents
// @route   POST /api/maintenance/generate
// @access  Private (Admin/Manager)
exports.generateMonthlyBills = async (req, res, next) => {
  try {
    const { month, year, amount, due_date } = req.body;

    if (!month || !year || !due_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide month, year, and due_date'
      });
    }

    const billAmount = amount || 1000;
    const residents = await User.find({ role: 'resident' });

    let createdCount = 0;
    let skippedCount = 0;

    for (const resident of residents) {
      // Check if already generated for this month/year for this flat
      const existing = await Maintenance.findOne({
        flat_no: resident.flat_no,
        month,
        year
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await Maintenance.create({
        user_id: resident._id,
        flat_no: resident.flat_no,
        month,
        year,
        amount: billAmount,
        total_amount: billAmount,
        due_date: new Date(due_date),
        status: new Date(due_date) < new Date() ? 'overdue' : 'pending'
      });

      createdCount++;
    }

    res.status(201).json({
      success: true,
      message: `Bills generation complete. Created: ${createdCount}, Skipped (Already existed): ${skippedCount}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Simulate/direct payment bypass without Razorpay setup
// @route   POST /api/maintenance/simulate-pay/:id
// @access  Private (All)
exports.simulatePayment = async (req, res, next) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    if (maintenance.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Bill is already paid'
      });
    }

    const simTxnId = `txn_sim_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

    // Update maintenance bill
    maintenance.status = 'paid';
    maintenance.paid_date = new Date();
    maintenance.razorpay_payment_id = simTxnId;
    maintenance.razorpay_order_id = 'simulated_order';
    maintenance.razorpay_signature = 'simulated_sig';
    await maintenance.save();

    // Create payment log entry
    await PaymentLog.create({
      user_id: maintenance.user_id,
      maintenance_id: maintenance._id,
      flat_no: maintenance.flat_no,
      amount: maintenance.total_amount,
      payment_date: new Date(),
      transaction_id: simTxnId,
      payment_method: 'simulated',
      month: maintenance.month,
      year: maintenance.year
    });

    res.status(200).json({
      success: true,
      message: 'Payment simulated successfully',
      data: maintenance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Razorpay order
// @route   POST /api/maintenance/create-order
// @access  Private (All)
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { id } = req.body;
    const maintenance = await Maintenance.findById(id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    // Check if Razorpay keys are placeholder/not set
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === 'rzp_test_placeholder' || !keySecret) {
      // Fallback simulated order for development
      const simOrderId = `order_sim_${Math.random().toString(36).substring(2, 12)}`;
      maintenance.razorpay_order_id = simOrderId;
      await maintenance.save();

      return res.status(200).json({
        success: true,
        is_simulated: true,
        order_id: simOrderId,
        amount: maintenance.total_amount * 100, // paise
        currency: 'INR',
        key_id: 'rzp_test_simulated'
      });
    }

    // Official order creation
    const options = {
      amount: maintenance.total_amount * 100, // in paise
      currency: 'INR',
      receipt: `receipt_${maintenance._id}`
    };

    const order = await razorpay.orders.create(options);
    
    maintenance.razorpay_order_id = order.id;
    await maintenance.save();

    res.status(200).json({
      success: true,
      is_simulated: false,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/maintenance/verify-payment
// @access  Private (All)
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, maintenance_id } = req.body;

    const maintenance = await Maintenance.findById(maintenance_id);
    if (!maintenance) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    const isSimulated = razorpay_order_id.startsWith('order_sim_');

    if (!isSimulated) {
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(razorpay_order_id + '|' + razorpay_payment_id);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed (invalid signature)'
        });
      }
    }

    // Mark as paid
    maintenance.status = 'paid';
    maintenance.paid_date = new Date();
    maintenance.razorpay_payment_id = razorpay_payment_id;
    maintenance.razorpay_signature = razorpay_signature || 'simulated_sig';
    await maintenance.save();

    // Create payment log
    await PaymentLog.create({
      user_id: maintenance.user_id,
      maintenance_id: maintenance._id,
      flat_no: maintenance.flat_no,
      amount: maintenance.total_amount,
      payment_date: new Date(),
      transaction_id: razorpay_payment_id,
      payment_method: isSimulated ? 'simulated' : 'razorpay',
      month: maintenance.month,
      year: maintenance.year
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and recorded successfully',
      data: maintenance
    });
  } catch (error) {
    next(error);
  }
};
