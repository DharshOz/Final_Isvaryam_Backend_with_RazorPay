import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  size: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1, required: true },
});

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, unique: true },
  items: [cartItemSchema],
}, { timestamps: true });

export const CartModel = mongoose.model('Cart', cartSchema);