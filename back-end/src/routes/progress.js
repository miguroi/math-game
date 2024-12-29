const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Progress = require('../models/Progress');

router.get('/', auth, async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user.id });
    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/update', auth, async (req, res) => {
  try {
    const { highScore, currentLevel, history } = req.body;
    
    let progress = await Progress.findOne({ userId: req.user.id });
    if (!progress) {
      progress = new Progress({ userId: req.user.id });
    }

    if (highScore > progress.highScore) {
      progress.highScore = highScore;
    }
    
    progress.currentLevel = currentLevel;
    progress.totalGamesPlayed += 1;
    
    if (history) {
      progress.history = [...progress.history, history].slice(-50); // Keep last 50 games
    }
    
    progress.updatedAt = Date.now();
    await progress.save();

    res.json(progress);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;