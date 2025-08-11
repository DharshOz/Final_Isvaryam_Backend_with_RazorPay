import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
  CustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  review: { type: String },
  rating: { type: Number },
  images: [{ type: String }], // <-- Add this line
  replies: [replySchema]
}, { timestamps: true });

export const ReviewModel = mongoose.model('Review', reviewSchema);
