const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/notifications/:userId – Get notifications for a user (by firebaseUID)
router.get('/:userId', async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUID: req.params.userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const notifications = await Notification.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate('relatedUser', 'name profileImage firebaseUID')
      .limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read/:id – Mark notification as read
router.put('/read/:id', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
