const PointlessEntry = require('../models/PointlessEntry');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

// Get questions from the JSON file
exports.getQuestions = async (req, res) => {
  try {
    // Check if user has already played a game
    const userEntries = await PointlessEntry.find({ user: req.user.id });
    if (userEntries.length > 0) {
      return res.status(403).json({ 
        message: 'You have already played Round 1. Each player can only play once.',
        alreadyPlayed: true
      });
    }
    
    // Read questions from the JSON file
    const questionsPath = path.join(__dirname, '../data/questions.json');
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
    
    // Return the full questions data or a subset if needed
    res.json(questionsData);
  } catch (err) {
    console.error('Error fetching questions:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Submit an answer
exports.submitAnswer = async (req, res) => {
  try {
    const { questionId, answer, score, valid } = req.body;
    
    if (!questionId || answer === undefined || score === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create new pointless entry
    const newEntry = new PointlessEntry({
      user: req.user.id,
      questionId,
      answer,
      score,
      isPointless: score === 0 && valid === true // Set isPointless flag if score is 0 and answer is valid
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

// Finalize the game and total the score
exports.finalizeGame = async (req, res) => {
  try {
    const { totalScore, scoreHistory } = req.body;
    
    // We could save the final game result or perform other actions here
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Game finalized successfully',
      totalScore,
      scoreCount: scoreHistory ? scoreHistory.length : 0
    });
  } catch (err) {
    console.error('Error finalizing game:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get user's pointless history
exports.getUserHistory = async (req, res) => {
  try {
    const entries = await PointlessEntry.find({ user: req.user.id }).sort({ createdAt: -1 });
    
    res.json(entries);
  } catch (err) {
    console.error('Error fetching user history:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Get all pointless entries (admin only)
exports.getAllEntries = async (req, res) => {
  try {
    // Check if user is admin
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