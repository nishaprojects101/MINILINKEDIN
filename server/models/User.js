const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUID: { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  headline:    { type: String, default: '' },
  bio:         { type: String, default: '' },
  skills:      { type: [String], default: [] },
  profileImage:{ type: String, default: '' },
  location:    { type: String, default: '' },
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
