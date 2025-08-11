import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import { WishlistModel } from '../models/whishlist.model.js';

const router = Router();

// Add to wishlist
router.post(
  '/',
  auth,
  handler(async (req, res) => {
    const { productId } = req.body;
    // Upsert: if exists, set whishlist to true, else create
    const wishlist = await WishlistModel.findOneAndUpdate(
      { userId: req.user.id, productId },
      { whishlist: true },
      { upsert: true, new: true }
    );
    res.status(201).json(wishlist);
  })
);

// Get all wishlist items for the logged-in user
router.get(
  '/',
  auth,
  handler(async (req, res) => {
    const items = await WishlistModel.find({ userId: req.user.id, whishlist: true })
      .populate('productId');
    res.json(items);
  })
);

// Remove from wishlist
// Remove from wishlist (hard delete)
router.delete(
  '/:productId',
  auth,
  handler(async (req, res) => {
    const { productId } = req.params;
    await WishlistModel.deleteOne({ userId: req.user.id, productId });
    res.json({ success: true });
  })
);
export default router;