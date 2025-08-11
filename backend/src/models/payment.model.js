// models/payment.model.js
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paymentId: {
    type: String,
    required: true,
  },
  method: {
    type: String, // "PayPal", "UPI", "Card", etc.
    default: 'unknown',
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export const PaymentModel = mongoose.model('Payment', paymentSchema);
