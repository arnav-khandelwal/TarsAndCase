const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, password, isAdmin } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }
    
    // Check if username is at least 3 characters
    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters long' });
    }
    
    // Check if password is at least 6 characters
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    
    // Check if user already exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ message: 'Username is already taken' });
    }
    
    // Create new user
    user = new User({
      username,
      password,
      // Only allow isAdmin to be set to true if explicitly specified in the request
      // For regular signup through the UI, this will always be false
      isAdmin: isAdmin === true
    });
    
    await user.save();
    
    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };
    
    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpire },
      (err, token) => {
        if (err) throw err;
        res.json({ token, isAdmin: user.isAdmin });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };
    
    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpire },
      (err, token) => {
        if (err) throw err;
        res.json({ token, isAdmin: user.isAdmin });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};