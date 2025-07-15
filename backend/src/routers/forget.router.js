
import nodemailer from 'nodemailer';
import { Router } from 'express';
import handler from 'express-async-handler';
import dotenv from 'dotenv';
import { UserModel } from '../models/user.model.js';
import bcrypt from 'bcryptjs';

dotenv.config(); // Load env vars from .env

const router = Router();

// Temporary in-memory stores
const otpStore = new Map();       // For OTP + expiry
const verifiedUsers = new Set();  // For tracking verified emails

// ===== Send OTP Endpoint =====
router.post(
  '/forget-send-otp',
  handler(async (req, res) => {
    const { email } = req.body;


    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(404).json({ error: 'Invalid Email! This Email is not an Existing user.!' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP with 5-minute expiry
    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    try {
      console.log(`Sending OTP to ${email}: ${otp}`);

      await transporter.sendMail({
        from: `"Isvaryam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
      });

      console.log('OTP email sent successfully');
      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      console.error('Error sending OTP:', error);
      res.status(500).json({ error: 'Failed to send OTP email' });
    }
  })
);

// ===== Verify OTP Endpoint =====
router.post(
  '/forget-verify-otp',
  handler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ error: 'No OTP found for this email' });
    }

    const { otp: storedOtp, expiresAt } = record;

    if (Date.now() > expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired' });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    otpStore.delete(email);           // ✅ Remove OTP
    verifiedUsers.add(email);         // ✅ Temporarily mark email as verified

    console.log(`OTP verified for ${email}`);
    res.json({ message: 'OTP verified successfully', verified: true });
  })
);


// ===== Reset Password Endpoint =====
router.post(
  '/forget-reset-password',
  handler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }
    if (!verifiedUsers.has(email)) {
      return res.status(403).json({ error: 'Email not verified for password reset' });
    }
    // Optionally: Add password strength validation here
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    verifiedUsers.delete(email);
    res.json({ message: 'Password reset successful' });
  })
);

export default router;
export { verifiedUsers };
