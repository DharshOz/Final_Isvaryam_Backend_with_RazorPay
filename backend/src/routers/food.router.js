import { Router } from 'express';
import { FoodModel } from '../models/food.model.js';
import handler from 'express-async-handler';
import admin from '../middleware/admin.mid.js';

const router = Router();

router.get(
  '/',
  handler(async (req, res) => {
    const products = await FoodModel.find({});
    res.send(products);
  })
);

router.post(
  '/',
  admin,
  handler(async (req, res) => {
    const { productId, name, description, images, category, specifications, quantities } = req.body;

    const product = new FoodModel({
      productId,
      name,
      description,
      images,
      category,
      specifications,
      quantities
    });

    await product.save();

    res.send(product);
  })
);

router.put(
  '/',
  admin,
  handler(async (req, res) => {
    const { id, productId, name, description, images, category, specifications, quantities } = req.body;

    await FoodModel.updateOne(
      { _id: id },
      {
        productId,
        name,
        description,
        images,
        category,
        specifications,
        quantities
      }
    );

    res.send();
  })
);

router.delete(
  '/:productId',
  admin,
  handler(async (req, res) => {
    const { productId } = req.params;
    await FoodModel.deleteOne({ productId });
    res.send();
  })
);

router.get(
  '/category/:category',
  handler(async (req, res) => {
    const { category } = req.params;
    const products = await FoodModel.find({ category });
    res.send(products);
  })
);

router.get(
  '/search/:searchTerm',
  handler(async (req, res) => {
    const { searchTerm } = req.params;
    const searchRegex = new RegExp(searchTerm, 'i');
    const products = await FoodModel.find({ name: { $regex: searchRegex } });
    res.send(products);
  })
);

router.get(
  '/:productId',
  handler(async (req, res) => {
    const { productId } = req.params;
    const product = await FoodModel.findOne({ productId });
    res.send(product);
  })
);

export default router;