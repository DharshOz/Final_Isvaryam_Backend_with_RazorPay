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

const PASSWORD_HASH_SALT_ROUNDS = 10;

router.post(
  '/login',
  handler(async (req, res) => {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.send(generateTokenResponse(user));
      return;
    }

    res.status(BAD_REQUEST).send('Username or password is invalid');
  })
);

router.post(
  '/register',
  handler(async (req, res) => {
    const { name, email, password, address, phone } = req.body; // <-- Add phone

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
      phone, // <-- Add phone
    };

    const result = await UserModel.create(newUser);
    res.send(generateTokenResponse(result));
  })
);

router.put(
  '/updateProfile',
  auth,
  handler(async (req, res) => {
    const { name, address, phone } = req.body; // <-- Add phone
    const user = await UserModel.findByIdAndUpdate(
      req.user.id,
      { name, address, phone }, // <-- Add phone
      { new: true }
    );

    res.send(generateTokenResponse(user));
  })
);

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
  res.send(generateTokenResponse(user)); // <-- Use the same response as login/register
});
export default router;
