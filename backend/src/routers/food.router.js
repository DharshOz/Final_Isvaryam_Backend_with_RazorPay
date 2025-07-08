import { Router } from 'express';
import { FoodModel } from '../models/food.model.js';
import handler from 'express-async-handler';
import admin from '../middleware/admin.mid.js';

const router = Router();

// Get all products
router.get(
  '/',
  handler(async (req, res) => {
    const products = await FoodModel.find({});
    res.send(products);
  })
);

// Add a product (admin only)
router.post(
  '/',
  admin,
  async (req, res) => {
    try {
      const { productId, name, description, images, category, specifications, quantities, discount } = req.body;

      const product = new FoodModel({
        productId,
        name,
        description,
        images,
        category,
        specifications,
        quantities,
        discount: discount ?? 0
      });

      await product.save();

      res.send(product);
    } catch (err) {
      console.error('Add product error:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

// Update a product (admin only)
router.put(
  '/',
  admin,
  handler(async (req, res) => {
    const { id, productId, name, description, images, category, specifications, quantities, discount } = req.body;

    await FoodModel.updateOne(
      { _id: id },
      {
        productId,
        name,
        description,
        images,
        category,
        specifications,
        quantities,
        discount: discount ?? 0
      }
    );

    res.send();
  })
);

// Delete a product (admin only)
router.delete(
  '/:id',
  admin,
  handler(async (req, res) => {
    const { id } = req.params;
    await FoodModel.deleteOne({ _id: id });
    res.send();
  })
);
// Get products by category
router.get(
  '/category/:category',
  handler(async (req, res) => {
    const { category } = req.params;
    const products = await FoodModel.find({ category });
    res.send(products);
  })
);

// Search products by name
router.get(
  '/search/:searchTerm',
  handler(async (req, res) => {
    const { searchTerm } = req.params;
    const searchRegex = new RegExp(searchTerm, 'i');
    const products = await FoodModel.find({ name: { $regex: searchRegex } });
    res.send(products);
  })
);

// Get a single product by productId
router.get(
  '/:productId',
  handler(async (req, res) => {
    const { productId } = req.params;
    const product = await FoodModel.findOne({ productId });
    res.send(product);
  })
);

router.get(
  '/product/:productId',
  handler(async (req, res) => {
    const { productId } = req.params;

    // Validate ObjectId
    if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const reviews = await ReviewModel.find({ productId })
      .populate('CustomerId', 'name');
    res.json(reviews);
  })
);
// Get a single product by MongoDB _id
router.get(
  '/id/:id',
  handler(async (req, res) => {
    const { id } = req.params;
    const product = await FoodModel.findById(id);
    res.send(product);
  })
);

export default router;
