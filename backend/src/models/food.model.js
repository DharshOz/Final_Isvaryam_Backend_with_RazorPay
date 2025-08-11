import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  images: [{ type: String }],
  category: { type: String },
  ingredients: [
    {
      name: { type: String, required: true },
      quantity: { type: String, required: true }
    }
  ],
  specifications: [
    {
      name: { type: String, required: true },
      value: { type: String, required: true }
    }
  ],
  quantities: [
    {
      size: { type: String, required: true },   // e.g., '500ml', '1kg'
      price: { type: Number, required: true }   // price for this size
    }
  ],
  discount: { type: Number, default: 0 } // Discount percentage (0-100)
});

export const FoodModel = mongoose.model('Product', productSchema);
