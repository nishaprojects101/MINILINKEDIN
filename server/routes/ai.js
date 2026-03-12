const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: (process.env.GROQ_API_KEY || '').trim() });

// POST /api/ai/enhance-bio
router.post('/enhance-bio', async (req, res) => {
  try {
    const { bio } = req.body;
    if (!bio) return res.status(400).json({ error: 'bio is required' });

    const chat = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a professional LinkedIn profile writer. Return ONLY the improved bio text, no quotes or explanations.',
        },
        {
          role: 'user',
          content: `Improve the following professional bio to make it more clear, confident, and professional for a LinkedIn profile:\n\nBIO:\n${bio}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
    });

    const enhanced = chat.choices[0]?.message?.content?.trim();
    res.json({ enhanced });
  } catch (err) {
    console.error('Groq bio error:', err);
    res.status(500).json({ error: 'AI enhancement failed' });
  }
});

// POST /api/ai/enhance-caption
router.post('/enhance-caption', async (req, res) => {
  try {
    const { caption } = req.body;
    if (!caption) return res.status(400).json({ error: 'caption is required' });

    const chat = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a LinkedIn content strategist. Return ONLY the improved caption text, no quotes or explanations.',
        },
        {
          role: 'user',
          content: `Rewrite the following LinkedIn post caption to be more engaging, professional, and clear:\n\nCAPTION:\n${caption}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 512,
    });

    const enhanced = chat.choices[0]?.message?.content?.trim();
    res.json({ enhanced });
  } catch (err) {
    console.error('Groq caption error:', err);
    res.status(500).json({ error: 'AI enhancement failed' });
  }
});

module.exports = router;
