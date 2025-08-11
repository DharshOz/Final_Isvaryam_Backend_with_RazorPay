import { Router } from 'express';
import handler from 'express-async-handler';
import auth from '../middleware/auth.mid.js';
import admin from '../middleware/admin.mid.js';
import { ReviewModel } from '../models/review.model.js';
import { FoodModel } from '../models/food.model.js';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // or your storage config

// Add a review (customer, authenticated)
router.post(
  '/',
  auth,
  upload.array('images', 5),
  handler(async (req, res) => {
    const { productId } = req.body;
    const customerId = req.user.id;

    // Count existing reviews for this user and product
    const reviewCount = await ReviewModel.countDocuments({
      productId,
      CustomerId: customerId,
    });

    if (reviewCount >= 3) {
      return res.status(400).json({ message: 'You have already submitted 3 reviews for this product.' });
    }

    const { review, rating } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];
    const newReview = await ReviewModel.create({
      CustomerId: customerId,
      productId,
      review,
      rating,
      images,
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
// Get reviews for a specific product
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
// Get average ratings for all products
router.get(
  '/average-ratings',
  handler(async (req, res) => {
    const averages = await ReviewModel.aggregate([
      {
        $group: {
          _id: '$productId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);
    res.json(averages);
  })
);

// Get ratings distribution for a specific product
router.get(
  '/product/:productId/ratings-distribution',
  handler(async (req, res) => {
    const { productId } = req.params;
    const distribution = await ReviewModel.aggregate([
      { $match: { productId: productId } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);
    const result = [5,4,3,2,1].map(star => ({
      rating: star,
      count: distribution.find(d => d._id === star) ? distribution.find(d => d._id === star).count : 0
    }));
    res.json(result);
  })
);

router.get(
  '/product/:productId',
  handler(async (req, res) => {
    const { productId } = req.params;

    const reviews = await ReviewModel.find({ productId })
      .populate('CustomerId', 'name')
      .populate('productId', 'name')
      .populate('replies.repliedBy', 'name'); // Populate reply user names

    res.json(reviews);
  })
);




export default router;
