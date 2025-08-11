import mongoose from 'mongoose';

const wishlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  whishlist: { type: Boolean, default: true }
}, { timestamps: true });

export const WishlistModel = mongoose.model('Wishlist', wishlistSchema);