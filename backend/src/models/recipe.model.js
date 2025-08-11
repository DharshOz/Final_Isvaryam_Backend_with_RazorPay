import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  quantity: { type: String, required: true }
}, { _id: false });

const ReviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, required: true },
  comment: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const RecipeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ingredients: [IngredientSchema],
  instructions: [{ type: String, required: true }],
  images: [String],
  tags: [String],
  ratings: [ReviewSchema],
  cookingTime: Number, // in minutes
  prepTime: Number,    // in minutes
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
  videoUrl: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export default mongoose.model('Recipe', RecipeSchema);