/**
 * One-time script: register BioBids webhook URL with Escrow.com.
 * Run once after deploying to production:
 *   node server/utils/registerWebhook.js
 *
 * Escrow.com does not have a dedicated webhook-registration endpoint in their
 * public API; webhooks are configured through Account Settings → Notifications
 * in the dashboard. This script validates connectivity and prints the
 * webhook URL that must be entered in the Escrow.com dashboard.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const escrowClient = require('../config/escrow');

const run = async () => {
  const webhookUrl = process.env.ESCROW_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.includes('yourdomain.com')) {
    console.error('ERROR: Set ESCROW_WEBHOOK_URL in .env to your real public URL before registering.');
    process.exit(1);
  }

  console.log('Testing Escrow.com API connectivity...');
  try {
    // Validate credentials by fetching account info
    const { data } = await escrowClient.get('/customer/me');
    console.log(`Connected as: ${data.email}`);
  } catch (err) {
    console.error('Escrow.com API connection failed:', err.response?.data || err.message);
    process.exit(1);
  }

  console.log('\n✅ API credentials are valid.');
  console.log('\nNext step — register your webhook URL in the Escrow.com dashboard:');
  console.log('  1. Log in at https://www.escrow-sandbox.com (sandbox) or https://www.escrow.com (production)');
  console.log('  2. Go to: Account Settings → API → Webhooks');
  console.log('  3. Add the following URL:');
  console.log(`\n     ${webhookUrl}\n`);
  console.log('  4. Select events: transaction.payment_approved, transaction.ship, transaction.accept, transaction.reject, transaction.refund_resolved, transaction.cancel');

  process.exit(0);
};

run().catch((err) => { console.error(err.message); process.exit(1); });
