const express = require('express');
const importRoutes = require('./routes/importRoutes');
const customerRoutes = require('./routes/customerRoutes');
const { requestLogger } = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());
app.use(requestLogger);

app.get('/', (req, res) => res.json({ status: 'ok' }));
app.use('/api/import', importRoutes);
app.use('/api/customers', customerRoutes);

app.use(errorHandler);

module.exports = app;