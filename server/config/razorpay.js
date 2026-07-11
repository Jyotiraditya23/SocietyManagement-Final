const Razorpay = require('razorpay');

let razorpay = null;

try {
  // Use placeholder keys if they are not provided in env to prevent crash on startup
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder';

  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
} catch (error) {
  console.warn('⚠️ Razorpay initialization warning:', error.message);
}

module.exports = razorpay;
