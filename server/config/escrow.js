const axios = require('axios');

// Flag 7: Warn at startup if credentials are missing
if (!process.env.ESCROW_EMAIL || !process.env.ESCROW_API_KEY) {
  console.warn('[Escrow] WARNING: ESCROW_EMAIL or ESCROW_API_KEY is not set. All Escrow.com API calls will fail.');
}

const escrowClient = axios.create({
  baseURL: process.env.ESCROW_BASE_URL || 'https://api.escrow-sandbox.com/2017-09-01',
  timeout: 15000, // 15 s — prevent hung requests
  headers: { 'Content-Type': 'application/json' },
  auth: {
    username: process.env.ESCROW_EMAIL,
    password: process.env.ESCROW_API_KEY,
  },
});

module.exports = escrowClient;
