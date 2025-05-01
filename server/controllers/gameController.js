const GameStatus = require('../models/GameStatus');

// Get current game status
exports.getGameStatus = async (req, res) => {
  try {
    // Find the most recent game status or create a default one if none exists
    let gameStatus = await GameStatus.findOne().sort({ updatedAt: -1 });
    
    if (!gameStatus) {
      // Create initial game status with both rounds unlocked
      gameStatus = new GameStatus({
        round1Locked: false,
        round2Locked: false
      });
      await gameStatus.save();
    }
    
    res.json({
      round1Locked: gameStatus.round1Locked,
      round2Locked: gameStatus.round2Locked
    });
  } catch (err) {
    console.error('Error getting game status:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Update game status (admin only)
exports.updateGameStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { round1Locked, round2Locked } = req.body;
    
    // Validate input
    if (round1Locked === undefined || round2Locked === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Create new game status
    const gameStatus = new GameStatus({
      round1Locked,
      round2Locked,
      updatedAt: Date.now()
    });
    
    await gameStatus.save();
    
    res.json({
      success: true,
      gameStatus
    });
  } catch (err) {
    console.error('Error updating game status:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};