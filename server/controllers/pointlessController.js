const PointlessEntry = require('../models/PointlessEntry');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// Get questions from the JSON file
exports.getQuestions = async (req, res) => {
  try {
    // Check if user has already completed a game
    const userEntries = await PointlessEntry.find({ user: req.user.id });
    if (userEntries.length === 10) {
      return res.status(403).json({ 
        message: 'You have already played Round 1. Each player can only play once.',
        alreadyPlayed: true
      });
    }
    
    // Read questions from the JSON file
    const questionsPath = path.join(__dirname, '../data/questions.json');
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    
    res.json(questionsData);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Check if a game exists and is valid
exports.checkGame = async (req, res) => {
  try {
    const gameId = req.params.gameId;
    const user = req.user.id;
    
    const entries = await PointlessEntry.find({ 
      user,
      gameId
    });
    
    // Game is valid if it exists but isn't complete (less than 10 entries)
    res.json({
      valid: entries.length > 0 && entries.length < 10
    });
  } catch (err) {
    console.error('Error checking game:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Check if an answer was already submitted
exports.checkAnswer = async (req, res) => {
  try {
    const { gameId, questionId } = req.params;
    const user = req.user.id;
    
    const entry = await PointlessEntry.findOne({
      user,
      gameId,
      questionId
    });
    
    if (entry) {
      res.json({
        submitted: true,
        answer: entry.answer,
        score: entry.score,
        valid: entry.isPointless !== undefined ? entry.isPointless : entry.score === 0
      });
    } else {
      res.json({
        submitted: false
      });
    }
  } catch (err) {
    console.error('Error checking answer:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Submit an answer
exports.submitAnswer = async (req, res) => {
  try {
    const { gameId, questionId, answer, score, valid } = req.body;
    const user = req.user.id;
    
    if (!gameId || !questionId || answer === undefined || score === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Check if this answer was already submitted
    const existingEntry = await PointlessEntry.findOne({
      user,
      gameId,
      questionId
    });
    
    if (existingEntry) {
      return res.status(200).json({ 
        message: 'Answer already submitted',
        entry: existingEntry
      });
    }
    
    // Create new entry
    const newEntry = new PointlessEntry({
      user,
      gameId,
      questionId,
      answer,
      score,
      isPointless: score === 0 && valid === true
    });
    
    await newEntry.save();
    
    res.status(201).json({
      success: true,
      entry: newEntry
    });
  } catch (err) {
    console.error('Error submitting answer:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Finalize the game
exports.finalizeGame = async (req, res) => {
  try {
    const { gameId, totalScore, scoreHistory } = req.body;
    const user = req.user.id;
    
    // Verify all 10 answers were submitted
    const entries = await PointlessEntry.find({ user, gameId });
    if (entries.length !== 10) {
      return res.status(400).json({ 
        message: 'Game not complete',
        submitted: entries.length
      });
    }
    
    res.json({
      success: true,
      message: 'Game finalized successfully',
      totalScore,
      entriesCount: entries.length
    });
  } catch (err) {
    console.error('Error finalizing game:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get user's pointless history
exports.getUserHistory = async (req, res) => {
  try {
    const entries = await PointlessEntry.find({ user: req.user.id })
      .sort({ createdAt: 1 }); // Sort by creation time
    
    res.json(entries);
  } catch (err) {
    console.error('Error fetching user history:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all pointless entries (admin only)
exports.getAllEntries = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const entries = await PointlessEntry.find()
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    console.error('Error fetching all entries:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};