const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') }); 
const { connectDB } = require('./config/db');
const config = require('./config/config');
const authRoutes = require('./routes/auth');
const tableRoutes = require('./routes/table');
const leaderboardRoutes = require('./routes/leaderboard');
const pointlessRoutes = require('./routes/pointless');
const gameRoutes = require('./routes/game');
const fs = require('fs');

// Initialize express app
const app = express();

console.log('Environment Variables:', process.env);

// Connect to MongoDB
connectDB();

// Ensure upload and data directories exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  
  // Copy questions.json to the data directory if it doesn't exist
  const questionsFilePath = path.join(dataDir, 'questions.json');
  if (!fs.existsSync(questionsFilePath)) {
    // Create a default questions.json file with some sample questions
    const defaultQuestions = require('./questions.json');
    fs.writeFileSync(questionsFilePath, JSON.stringify(defaultQuestions, null, 2));
    console.log('Created default questions.json file');
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/pointless', pointlessRoutes);
app.use('/api/game', gameRoutes);

// Serve static assets if in production
if (config.nodeEnv === 'production') {
  // Set static folder
  app.use(express.static('../client/dist'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Server Error', error: err.message });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});