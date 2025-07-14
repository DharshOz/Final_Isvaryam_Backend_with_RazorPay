import { Router } from 'express';
import jwt from 'jsonwebtoken';
const router = Router();
import { BAD_REQUEST } from '../constants/httpStatus.js';
import handler from 'express-async-handler';
import { UserModel } from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import auth from '../middleware/auth.mid.js';
import admin from '../middleware/admin.mid.js';
import { generateTokenResponse } from '../utils/generateToken.js';
import { verifiedUsers } from './mail.route.js'; // ✅ Import OTP map

const PASSWORD_HASH_SALT_ROUNDS = 10;

// ✅ Modified /login route with OTP fallback
router.post(
  '/login',
  handler(async (req, res) => {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });

    if (!user) {
      // ✅ Check if verified via OTP but not yet in DB
      if (verifiedUsers.has(email)) {
        // ✅ Create temporary user (optional)
        const tempUser = await UserModel.create({
          name: email.split('@')[0],
          email,
          password: '', // No password since it's OTP-based
        });

        verifiedUsers.delete(email);
        return res.send(generateTokenResponse(tempUser));
      }

      return res.status(BAD_REQUEST).send('User not found');
    }

    if (password) {
      if (
        typeof password !== 'string' ||
        typeof user.password !== 'string' ||
        !user.password
      ) {
        return res.status(BAD_REQUEST).send('Invalid credentials format');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(BAD_REQUEST).send('Username or password is invalid');
      }

      return res.send(generateTokenResponse(user));
    }

    if (verifiedUsers.has(email)) {
      verifiedUsers.delete(email); // ✅ Clear after use
      return res.send(generateTokenResponse(user));
    }

    return res.status(BAD_REQUEST).send('OTP not verified for this email');
  })
);

// Register
router.post(
  '/register',
  handler(async (req, res) => {
    const { name, email, password, address, phone } = req.body;

    const user = await UserModel.findOne({ email });

    if (user) {
      res.status(BAD_REQUEST).send('User already exists, please login!');
      return;
    }

    const hashedPassword = await bcrypt.hash(
      password,
      PASSWORD_HASH_SALT_ROUNDS
    );

    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      address,
      phone,
    };

    const result = await UserModel.create(newUser);
    res.send(generateTokenResponse(result));
  })
);

// Profile update
router.put(
  '/updateProfile',
  auth,
  handler(async (req, res) => {
    const { name, address, phone } = req.body;
    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { name, address, phone },
      { new: true }
    );

    res.send(generateTokenResponse(user));
  })
);

// Change password
router.put(
  '/changePassword',
  auth,
  handler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      res.status(BAD_REQUEST).send('Change Password Failed!');
      return;
    }

    const equal = await bcrypt.compare(currentPassword, user.password);

    if (!equal) {
      res.status(BAD_REQUEST).send('Current Password Is Not Correct!');
      return;
    }

    user.password = await bcrypt.hash(newPassword, PASSWORD_HASH_SALT_ROUNDS);
    await user.save();

    res.send('Password changed successfully');
  })
);

// Google signup
router.post('/google-signup', async (req, res) => {
  const { name, email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  let user = await UserModel.findOne({ email });
  if (!user) {
    user = await UserModel.create({
      name,
      email,
      googleSignup: true,
      password: '', // No password for Google users
    });
  }

  res.send(generateTokenResponse(user));
});

export default router;
