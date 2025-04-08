const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

module.exports = {
  // Server configuration
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB configuration
  mongoURI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tableProject',
  
  // JWT configuration
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key_here',
  jwtExpire: '1d', // Token expires in 1 day

  
  // Gemini AI API configuration
  geminiApiKey: process.env.GEMINI_API_KEY || 'AIzaSyDOi60hbjvzD1NHi-xULzUCMj0HdITftnM',
  REFERENCE_IMAGE_PATH: process.env.REFERENCE_IMAGE_PATH || './uploads/reference.jpg',
  
  // File upload configuration
  uploadDir: path.join(__dirname, '../uploads'), // Absolute path
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif']
};