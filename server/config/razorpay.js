const Razorpay = require('razorpay');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

let razorpay = null;

const getRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_id') {
      console.warn('[Razorpay] No real key configured — payment features disabled in dev');
      return null;
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

module.exports = getRazorpay;
