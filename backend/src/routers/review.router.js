import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import admin from '../middleware/admin.mid.js';
import { ReviewModel } from '../models/review.model.js';
import { FoodModel } from '../models/food.model.js';

const router = Router();

// Add a review (customer, authenticated)
router.post(
  '/',
  auth,
  handler(async (req, res) => {
    const { productId, review, rating } = req.body;
    const newReview = await ReviewModel.create({
      CustomerId: req.user.id,
      productId,
      review,
      rating,
      replies: []
    });
    res.status(201).json(newReview);
  })
);

// Get all reviews
router.get(
  '/',
  handler(async (req, res) => {
    const reviews = await ReviewModel.find()
      .populate('CustomerId', 'name')
      .populate('productId', 'name');
    res.json(reviews);
  })
);

// Get reviews for a specific product
router.get(
  '/product/:productId',
  handler(async (req, res) => {
    const { productId } = req.params;
    const reviews = await ReviewModel.find({ productId })
      .populate('CustomerId', 'name');
    res.json(reviews);
  })
);

// Get reviews by category
router.get(
  '/category/:category',
  handler(async (req, res) => {
    const products = await FoodModel.find({ category: req.params.category }, '_id');
    const productIds = products.map(p => p._id);
    const reviews = await ReviewModel.find({ productId: { $in: productIds } })
      .populate('CustomerId', 'name');
    res.json(reviews);
  })
);

// Get reviews by date (recent first)
router.get(
  '/recent',
  handler(async (req, res) => {
    const reviews = await ReviewModel.find()
      .sort({ createdAt: -1 })
      .populate('CustomerId', 'name');
    res.json(reviews);
  })
);

// Get reviews by date (specific date)
router.get(
  '/date/:date',
  handler(async (req, res) => {
    const date = new Date(req.params.date);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const reviews = await ReviewModel.find({
      createdAt: { $gte: date, $lt: nextDate }
    }).populate('CustomerId', 'name');
    res.json(reviews);
  })
);

// Admin: add a reply to a review (push to replies array)
router.put(
  '/reply/:reviewId',
  admin,
  handler(async (req, res) => {
    const { text } = req.body;
    const { reviewId } = req.params;
    const reply = {
      text,
      repliedBy: req.user.id,
      createdAt: new Date()
    };
    const review = await ReviewModel.findByIdAndUpdate(
      reviewId,
      { $push: { replies: reply } },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  })
);

// Admin: update a specific reply
router.put(
  '/reply/:reviewId/:replyId',
  admin,
  handler(async (req, res) => {
    const { text } = req.body;
    const { reviewId, replyId } = req.params;
    const review = await ReviewModel.findOneAndUpdate(
      { _id: reviewId, "replies._id": replyId },
      { $set: { "replies.$.text": text } },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: 'Reply not found' });
    res.json(review);
  })
);

export default router;