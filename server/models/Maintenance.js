const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  flat_no: {
    type: String,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 1000  // Fixed ₹1000
  },
  due_date: {
    type: Date,
    required: true
  },
  paid_date: {
    type: Date,
    default: null
  },
  late_fee: {
    type: Number,
    default: 0  // ₹100 if overdue
  },
  total_amount: {
    type: Number,
    default: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'overdue'],
    default: 'pending'
  },
  razorpay_order_id: {
    type: String,
    default: null
  },
  razorpay_payment_id: {
    type: String,
    default: null
  },
  razorpay_signature: {
    type: String,
    default: null
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Compound index for unique month/year per flat
MaintenanceSchema.index({ flat_no: 1, month: 1, year: 1 }, { unique: true });
MaintenanceSchema.index({ status: 1 });
MaintenanceSchema.index({ due_date: 1 });

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
