const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the URI provided in environment variables.
 * Exits the process on failure so issues are caught early (e.g. in CI/Docker).
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
