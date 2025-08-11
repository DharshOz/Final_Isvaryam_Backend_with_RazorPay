import { Router } from 'express';
import handler from 'express-async-handler';
import admin from '../middleware/admin.mid.js';
import { OrderModel } from '../models/order.model.js';

const router = Router();

// Revenue Trend (per day)
router.get(
  '/revenue',
  admin,
  handler(async (req, res) => {
    const trend = await OrderModel.aggregate([
      { $match: { status: { $ne: 'NEW' } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalRevenue: { $sum: "$totalPrice" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(trend);
  })
);

// Most Sold Products
router.get(
  '/products',
  admin,
  handler(async (req, res) => {
    const products = await OrderModel.aggregate([
      { $unwind: "$items" },
      { $group: {
        _id: "$items.product",
        totalSold: { $sum: "$items.quantity" }
      }},
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" }
    ]);
    res.json(products);
  })
);

export default router;