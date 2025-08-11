import { Router } from 'express';
import { CartModel } from '../models/cart.model.js';
import auth from '../middleware/auth.mid.js';

const router = Router();

// Get current user's cart
router.get('/', auth, async (req, res) => {
  const cart = await CartModel.findOne({ userId: req.user.id }).populate('items.productId');
  res.json(cart || { items: [] });
});

// Add or update an item in the cart
router.post('/', auth, async (req, res) => {
  console.log('POST /api/cart', req.body);
  const { productId, size, price, quantity } = req.body;
  if (!productId || !size || !price) {
    return res.status(400).json({ message: 'Missing productId, size, or price' });
  }
  let cart = await CartModel.findOne({ userId: req.user.id });
  if (!cart) {
    cart = await CartModel.create({
      userId: req.user.id,
      items: [{ productId, size, price, quantity }],
    });
  } else {
    const item = cart.items.find(i => i.productId.equals(productId) && i.size === size);
    if (item) {
      item.quantity = quantity; // <-- SET, don't add!
      item.price = price;
    } else {
      cart.items.push({ productId, size, price, quantity });
    }
    await cart.save();
  }
  const populatedCart = await CartModel.findOne({ userId: req.user.id }).populate('items.productId');
  res.json(populatedCart);
});

// Remove an item from the cart
router.delete('/:productId/:size', auth, async (req, res) => {
  const { productId, size } = req.params;
  const cart = await CartModel.findOne({ userId: req.user.id });
  if (cart) {
    cart.items = cart.items.filter(i => !(i.productId.equals(productId) && i.size === size));
    if (cart.items.length === 0) {
      await CartModel.deleteOne({ userId: req.user.id });
      return res.json({ items: [] });
    } else {
      await cart.save();
      // Always return the latest populated cart!
      const populatedCart = await CartModel.findOne({ userId: req.user.id }).populate('items.productId');
      return res.json(populatedCart);
    }
  }
  res.json({ items: [] });
});

// Clear the cart (delete the cart document)
router.delete('/', auth, async (req, res) => {
  await CartModel.findOneAndDelete({ userId: req.user.id });
  res.json({ message: 'Cart deleted' });
});

export default router;