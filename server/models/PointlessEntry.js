const mongoose = require('mongoose');

const PointlessEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: Number,
    required: true
  },
  answer: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  isPointless: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('PointlessEntry', PointlessEntrySchema);