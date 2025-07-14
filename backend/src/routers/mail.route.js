import nodemailer from 'nodemailer';
import { Router } from 'express';
import handler from 'express-async-handler';

const router = Router();

// In-memory OTP store (use Redis/Mongo for production)
const otpStore = new Map();
const verifiedUsers = new Set();

// Send OTP
router.post(
  '/send-otp',
  handler(async (req, res) => {
    const { email } = req.body;

    if (!email) return res.status(400).send({ error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your_email@gmail.com', // Replace with your Gmail
        pass: 'your_app_password',     // Replace with Gmail App Password
      },
    });

    await transporter.sendMail({
      from: '"Isvaryam" <your_email@gmail.com>',
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
    });

    res.send({ message: 'OTP sent successfully' });
  })
);

// Verify OTP
router.post(
  '/verify-otp',
  handler(async (req, res) => {
    const { email, otp } = req.body;

    const record = otpStore.get(email);

    if (!record) {
      return res.status(400).send({ error: 'OTP not found for this email' });
    }

    const { otp: storedOtp, expiresAt } = record;

    if (Date.now() > expiresAt) {
      otpStore.delete(email);
      return res.status(400).send({ error: 'OTP has expired' });
    }

    if (storedOtp !== otp) {
      return res.status(400).send({ error: 'Invalid OTP' });
    }

    verifiedUsers.add(email);        // Mark user as verified
    otpStore.delete(email);          // Clean up used OTP

    res.send({ message: 'OTP verified successfully', verified: true });
  })
);

// You can access `verifiedUsers.has(email)` during registration
export { router as otpRouter, verifiedUsers };
