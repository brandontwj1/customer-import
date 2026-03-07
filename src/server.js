const express = require('express');
const connectDB = require('./config/db');
const importRoutes = require('./routes/importRoutes');
const customerRoutes = require('./routes/customerRoutes');
const { requestLogger } = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler'); 
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000; // Default to 3000 if PORT is not set
app.use(express.json());
app.use(requestLogger);

async function startServer() {
  try {
    await connectDB();

    app.get('/', (req, res) => res.json({ status: 'ok' }));

    app.use('/api/import', importRoutes);
    app.use('/api/customers', customerRoutes);

    app.use(errorHandler);

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  } 
}

startServer();
