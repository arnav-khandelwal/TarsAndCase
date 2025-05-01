const mongoose = require('mongoose');

const GameStatusSchema = new mongoose.Schema({
  round1Locked: {
    type: Boolean,
    default: false
  },
  round2Locked: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('GameStatus', GameStatusSchema);