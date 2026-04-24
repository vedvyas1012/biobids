const axios = require('axios');

const escrowClient = axios.create({
  baseURL: process.env.ESCROW_BASE_URL || 'https://api.escrow-sandbox.com/2017-09-01',
  headers: { 'Content-Type': 'application/json' },
  auth: {
    username: process.env.ESCROW_EMAIL,
    password: process.env.ESCROW_API_KEY,
  },
});

module.exports = escrowClient;
