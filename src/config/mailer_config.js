import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ✅ Create transporter with YOUR actual configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "mail.hii.life",
  port: parseInt(process.env.SMTP_PORT) || 465,
  secure: true, // true for 465 (SSL)
  auth: {
    user: process.env.SMTP_USER || "support@hii.life",
    pass: process.env.SMTP_PASS || "ZA3_N9fGSwNuZRIl",
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, 
  greetingTimeout: 10000,
  debug: false,
  logger: false
});

// ✅ Verify connection WITHOUT console logs
transporter.verify((error, success) => {
  if (error) {
    // intentionally silent (no console)
  } else {
    // intentionally silent (no console)
  }
});

export default transporter;
