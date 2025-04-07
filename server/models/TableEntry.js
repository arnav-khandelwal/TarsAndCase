const mongoose = require('mongoose');

const TableEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serialNumber: {
    type: Number,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TableEntry', TableEntrySchema);