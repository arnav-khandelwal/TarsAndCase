const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const auth = require('../middleware/auth');

// @route   GET api/game/status
// @desc    Get current game status
// @access  Private
router.get('/status', auth, gameController.getGameStatus);

// @route   PUT api/game/status
// @desc    Update game status (admin only)
// @access  Private (Admin)
router.put('/status', auth, gameController.updateGameStatus);

module.exports = router;