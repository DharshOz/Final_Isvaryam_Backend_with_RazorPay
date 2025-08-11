import mongoose from 'mongoose';

const CouponSchema = new mongoose.Schema({
  couponCode: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  offerPercentage: { type: Number, required: true },
  category: { type: String, enum: ['common', 'group', 'individual'], required: true },
  minPurchaseAmount: { type: Number },
  minPurchaseCount: { type: Number }, // <-- Added
  expiryDate: { type: Date }
}, { timestamps: true });

export default mongoose.model('Coupon', CouponSchema);