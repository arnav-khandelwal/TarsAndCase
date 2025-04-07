const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { compareImages } = require('../controllers/aiController');
const auth = require('../middleware/auth');

router.post('/compare', auth, upload.single('image'), compareImages);

module.exports = router;