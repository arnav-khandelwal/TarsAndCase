const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST api/table
// @desc    Create a new table entry
// @access  Private
router.post('/', auth, upload.single('image'), tableController.createEntry);

// @route   GET api/table/user
// @desc    Get all entries for current user
// @access  Private
router.get('/user', auth, tableController.getUserEntries);

// @route   GET api/table/all
// @desc    Get all entries (admin only)
// @access  Private (Admin)
router.get('/all', auth, tableController.getAllEntries);

// @route   DELETE api/table/:id
// @desc    Delete an entry
// @access  Private
router.delete('/:id', auth, tableController.deleteEntry);

module.exports = router;