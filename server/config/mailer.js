const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendMail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MAIL] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: `BioBids <${process.env.EMAIL_USER}>`, to, subject, html });
};

module.exports = { sendMail };
