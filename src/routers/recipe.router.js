import { Router } from 'express';
import Recipe from '../models/recipe.model.js';
import  auth  from '../middleware/auth.mid.js';
import '../models/user.model.js'; // Make sure the path is correct

const router = Router();

// Create a recipe
router.post('/', auth, async (req, res) => {
  try {
    const recipe = await Recipe.create({ ...req.body, author: req.user.id });
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all recipes
router.get('/', async (req, res) => {
  const recipes = await Recipe.find().populate('author', 'name').lean();
  res.json(recipes);
});

// Get a recipe by ID
router.get('/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).populate('author', 'name').lean();
    if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ message: 'Invalid recipe ID' });
  }
});

// Update a recipe
router.put('/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findOneAndUpdate(
      { _id: req.params.id, author: req.user.id },
      req.body,
      { new: true }
    );
    if (!recipe) return res.status(404).json({ message: 'Recipe not found or not authorized' });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a recipe
router.delete('/:id', auth, async (req, res) => {
  const recipe = await Recipe.findOneAndDelete({ _id: req.params.id, author: req.user.id });
  if (!recipe) return res.status(404).json({ message: 'Recipe not found or not authorized' });
  res.json({ message: 'Recipe deleted' });
});

// Like a recipe
router.post('/:id/like', auth, async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { likes: req.user.id } },
    { new: true }
  );
  if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
  res.json(recipe);
});

// Unlike a recipe
router.post('/:id/unlike', auth, async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(
    req.params.id,
    { $pull: { likes: req.user.id } },
    { new: true }
  );
  if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
  res.json(recipe);
});

// Add a review
router.post('/:id/review', auth, async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating) return res.status(400).json({ message: 'Rating is required' });
  const recipe = await Recipe.findByIdAndUpdate(
    req.params.id,
    { $push: { ratings: { user: req.user.id, rating, comment } } },
    { new: true }
  );
  if (!recipe) return res.status(404).json({ message: 'Recipe not found' });
  res.json(recipe);
});

export default router