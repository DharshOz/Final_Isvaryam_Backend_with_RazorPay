import { Router } from 'express';
import Coupon from '../models/coupon.model.js';
import  auth  from '../middleware/auth.mid.js';
import  admin  from '../middleware/admin.mid.js';

const router = Router();

// Create a coupon (admin only)
router.post('/', admin, async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all coupons (admin)
router.get('/',auth, async (req, res) => {
  const coupons = await Coupon.find();
  res.json(coupons);
});

// Get a coupon by code (public)
router.get('/:code', auth, async (req, res) => {
  const coupon = await Coupon.findOne({ couponCode: req.params.code });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  res.json(coupon);
});

// Update a coupon (admin)
router.put('/:id', admin, async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
  res.json(coupon);
});

// Delete a coupon (admin)
router.delete('/:id', admin, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ message: 'Coupon deleted' });
});

export default router;