const express = require('express');
const connectDB = require('./config/db');
const importRoutes = require('./routes/importRoutes');
require('dotenv').config();


const app = express();
app.use(express.json());

async function startServer() {
  try {
    await connectDB();

    app.get('/', (req, res) => res.json({ status: 'ok' }));

    app.use('/api/import', importRoutes);
    
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });

  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  } 
}

startServer();
