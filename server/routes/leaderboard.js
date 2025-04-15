const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');

// @route   GET api/leaderboard
// @desc    Get leaderboard data
// @access  Public
router.get('/', leaderboardController.getLeaderboard);

// @route   GET api/leaderboard/user
// @desc    Get current user's ranking
// @access  Private
router.get('/user', auth, leaderboardController.getUserRanking);

module.exports = router;