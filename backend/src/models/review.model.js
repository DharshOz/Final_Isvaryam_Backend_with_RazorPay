import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  CustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true }, // ✅ Fixed ref
  review: { type: String },
  rating: { type: Number },
  images: [{ type: String }],
  replies: [replySchema]
}, { timestamps: true });

export const ReviewModel = mongoose.model('Review', reviewSchema);
