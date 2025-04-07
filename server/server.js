const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const config = require('./config/config');
const authRoutes = require('./routes/auth');
const tableRoutes = require('./routes/table');
const aiRoutes = require('./routes/ai');
const fs = require('fs');
// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/table', tableRoutes);
app.use('/api/ai', aiRoutes);

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