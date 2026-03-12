const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  author:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption:        { type: String, required: true },
  image:          { type: String, default: '' },
  likes:          [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments:       [commentSchema],
  detectedSkills: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
