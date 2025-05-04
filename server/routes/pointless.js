const express = require('express');
const router = express.Router();
const pointlessController = require('../controllers/PointlessController');
const auth = require('../middleware/auth');

// @route   GET api/pointless/questions
// @desc    Get pointless questions
// @access  Private
router.get('/questions', auth, pointlessController.getQuestions);

// @route   POST api/pointless/submit
// @desc    Submit a pointless answer
// @access  Private
router.post('/submit', auth, pointlessController.submitAnswer);

// @route   POST api/pointless/finalize
// @desc    Finalize game and get total score
// @access  Private
router.post('/finalize', auth, pointlessController.finalizeGame);

// @route   GET api/pointless/history
// @desc    Get user's pointless history
// @access  Private
router.get('/history', auth, pointlessController.getUserHistory);

// @route   GET api/pointless/all
// @desc    Get all pointless entries (admin only)
// @access  Private (Admin)
router.get('/all', auth, pointlessController.getAllEntries);

// Add these routes
router.get('/check-game/:gameId', auth, pointlessController.checkGame);
router.get('/check-answer/:gameId/:questionId', auth, pointlessController.checkAnswer);


module.exports = router;