const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { upload, uploadToCloudinary } = require('../config/cloudinary');

// ── Skill detection ────────────────────────────────────────────────
const KNOWN_SKILLS = [
  'javascript','typescript','python','java','c++','c#','ruby','go','rust','swift',
  'kotlin','php','html','css','sql','react','angular','vue','node.js','nodejs',
  'express','django','flask','spring','docker','kubernetes','aws','azure','gcp',
  'mongodb','postgresql','mysql','redis','graphql','rest','api','git','linux',
  'machine learning','deep learning','ai','data science','blockchain','web3',
  'figma','photoshop','ui/ux','tailwind','bootstrap','next.js','nuxt',
  'tensorflow','pytorch','pandas','numpy','devops','ci/cd','agile','scrum',
  'product management','leadership','communication','marketing','seo',
];

function detectSkills(text) {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter(skill => {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(lower);
  });
}

// ── POST /api/posts – create post ──────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { caption, authorUID } = req.body;
    if (!caption || !authorUID) {
      return res.status(400).json({ error: 'caption and authorUID required' });
    }

    const author = await User.findOne({ firebaseUID: authorUID });
    if (!author) return res.status(404).json({ error: 'Author not found' });

    let imageUrl = '';
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer, 'minilinkedin/posts');
      } catch (uploadErr) {
        console.warn('⚠️ Cloudinary upload failed, proceeding without image:', uploadErr.message);
        // We continue so the post can still be created without an image
      }
    }

    const detectedSkills = detectSkills(caption);

    const post = await Post.create({
      author: author._id,
      caption,
      image: imageUrl,
      detectedSkills,
    });

    // ── Skill-match notifications ──────────────────────────────────
    if (detectedSkills.length > 0) {
      // Find users with matching skills in their profile
      const matchingUsers = await User.find({
        _id: { $ne: author._id },
        skills: { $in: detectedSkills.map(s => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) },
      }).limit(10);

      for (const matchUser of matchingUsers) {
        const sharedSkill = detectedSkills.find(skill =>
          matchUser.skills.some(s => s.toLowerCase() === skill.toLowerCase())
        );
        await Notification.create({
          user: matchUser._id,
          message: `You and ${author.name} both know ${sharedSkill}. Consider connecting since you share similar skills!`,
          relatedUser: author._id,
        });
      }

      // Also find users who mentioned same skills in their posts
      const matchingPosts = await Post.find({
        author: { $ne: author._id },
        detectedSkills: { $in: detectedSkills },
      }).populate('author').limit(10);

      const alreadyNotified = new Set(matchingUsers.map(u => u._id.toString()));
      for (const mp of matchingPosts) {
        if (mp.author && !alreadyNotified.has(mp.author._id.toString())) {
          const sharedSkill = detectedSkills.find(s => mp.detectedSkills.includes(s));
          await Notification.create({
            user: mp.author._id,
            message: `You and ${author.name} both mentioned ${sharedSkill}. Consider connecting!`,
            relatedUser: author._id,
          });
          alreadyNotified.add(mp.author._id.toString());
        }
      }
    }

    const populated = await Post.findById(post._id).populate('author', 'name headline profileImage firebaseUID');
    res.status(201).json(populated);
  } catch (err) {
    console.error('--- POST /api/posts Error ---');
    console.error('Message:', err.message);
    if (err.http_code) console.error('HTTP Code:', err.http_code);
    if (err.name) console.error('Name:', err.name);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message || 'Unknown server error' });
  }
});

// ── GET /api/posts – get all posts (newest first) ──────────────────
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('author', 'name headline profileImage firebaseUID')
      .populate('comments.user', 'name profileImage firebaseUID');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/posts/:id/like – toggle like ─────────────────────────
router.post('/:id/like', async (req, res) => {
  try {
    const { userUID } = req.body;
    const user = await User.findOne({ firebaseUID: userUID });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const idx = post.likes.indexOf(user._id);
    if (idx === -1) {
      post.likes.push(user._id);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();
    res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/posts/:id/comment – add comment ─────────────────────
router.post('/:id/comment', async (req, res) => {
  try {
    const { userUID, text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const user = await User.findOne({ firebaseUID: userUID });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({ user: user._id, text });
    await post.save();

    const updated = await Post.findById(post._id)
      .populate('author', 'name headline profileImage firebaseUID')
      .populate('comments.user', 'name profileImage firebaseUID');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
