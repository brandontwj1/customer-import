const mongoose = require('mongoose');

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB via Mongoose');
  console.log('MongoDB connection string:', process.env.MONGO_URI);
}

module.exports = connectDB;