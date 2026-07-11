const mongoose = require('mongoose');

const PaymentLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  maintenance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance',
    required: true
  },
  flat_no: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  payment_date: {
    type: Date,
    default: Date.now
  },
  transaction_id: {
    type: String,
    required: true
  },
  payment_method: {
    type: String,
    default: 'razorpay'
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

PaymentLogSchema.index({ user_id: 1 });
PaymentLogSchema.index({ flat_no: 1 });
PaymentLogSchema.index({ payment_date: -1 });

module.exports = mongoose.model('PaymentLog', PaymentLogSchema);
