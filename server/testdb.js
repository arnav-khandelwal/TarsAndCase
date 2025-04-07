// Create a test file testdb.js in your server directory
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/tableProject', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));