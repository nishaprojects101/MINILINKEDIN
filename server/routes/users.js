const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { upload, uploadToCloudinary } = require('../config/cloudinary');

// POST /api/users/create – Create a new user record (called after Firebase signup)
router.post('/create', async (req, res) => {
  try {
    const { firebaseUID, name, email } = req.body;
    if (!firebaseUID || !name || !email) {
      return res.status(400).json({ error: 'firebaseUID, name, and email are required' });
    }

    const existing = await User.findOne({ firebaseUID });
    if (existing) return res.status(200).json(existing);

    const user = await User.create({ firebaseUID, name, email });
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/:id – Get user by firebaseUID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUID: req.params.id }).populate('connections', 'name headline profileImage firebaseUID');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id – Update user profile (supports image upload)
router.put('/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const updateData = {};
    const fields = ['name', 'headline', 'bio', 'location'];
    fields.forEach(f => { if (req.body[f] !== undefined) updateData[f] = req.body[f]; });

    if (req.body.skills) {
      updateData.skills = typeof req.body.skills === 'string'
        ? JSON.parse(req.body.skills) : req.body.skills;
    }

    // Upload image to Cloudinary if provided
    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer, 'minilinkedin/profiles');
      updateData.profileImage = imageUrl;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUID: req.params.id },
      updateData,
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users – Get all users (for people you may know)
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('name headline profileImage firebaseUID skills');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
