const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Comprehensive connection function
async function connectToDatabase() {
  // Connection options with explicit IPv4 preference
  const connectionOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 15000, // 15 seconds
    socketTimeoutMS: 45000, // 45 seconds
    family: 4 // Force IPv4
  };

  // Connection strings to try
  const connectionStrings = [
    process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tableProject',
    'mongodb://127.0.0.1:27017/tableProject',
    'mongodb://localhost:27017/tableProject'
  ];

  for (const uri of connectionStrings) {
    try {
      console.log(`Attempting to connect with: ${uri}`);
      
      await mongoose.connect(uri, connectionOptions);
      
      console.log('MongoDB Connected Successfully');
      return true;
    } catch (error) {
      console.error('Connection Error Details:', {
        uri,
        message: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      });
    }
  }

  throw new Error('Unable to connect to MongoDB');
}

const createAdmin = async () => {
  try {
    // Ensure database connection
    await connectToDatabase();
    
    // Check if admin already exists
    const adminExists = await User.findOne({ 
      $or: [
        { username: 'admin' },
        { isAdmin: true }
      ]
    });
    
    if (adminExists) {
      console.log('Admin user already exists!');
      return;
    }
    
    // Create admin user
    const admin = new User({
      username: 'admin',
      password: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123!',
      isAdmin: true,
      email: process.env.ADMIN_EMAIL || 'admin@tableproject.com'
    });
    
    await admin.save();
    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error in admin creation process:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    throw error;
  } finally {
    // Close the connection
    await mongoose.disconnect();
  }
};

// Run the script
createAdmin()
  .then(() => {
    console.log('Admin creation process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Admin creation failed:', error);
    process.exit(1);
  });