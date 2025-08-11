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
  handler(async (req, res) => {
    const { productId, name, description, images, category, ingredients, specifications, quantities, discount } = req.body;

    const product = new FoodModel({
      productId,
      name,
      description,
      images,
      category,
      ingredients,
      specifications,
      quantities,
      discount: discount ?? 0
    });

    await product.save();

    res.send(product);
  })
);

// Update a product (admin only)
router.put(
  '/',
  admin,
  handler(async (req, res) => {
    const {
      id,
      productId,
      name,
      description,
      images,
      category,
      ingredients,
      specifications,
      quantities,
      discount
    } = req.body;

    // Log for debugging
    console.log('Update payload:', req.body);

    // Validate required fields
    if (!id) {
      return res.status(400).json({ error: 'Product id is required' });
    }

    // Update and return the updated document
    const updated = await FoodModel.findByIdAndUpdate(
      id,
      {
        productId,
        name,
        description,
        images,
        category,
        ingredients,
        specifications,
        quantities,
        discount: discount ?? 0
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.send(updated);
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
