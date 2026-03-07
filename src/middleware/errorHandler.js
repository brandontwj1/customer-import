const { logger } = require('./logger');

function errorHandler(err, req, res, next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    logger.error(message, { status, stack: err.stack });

    res.status(status).json({ error: message, status });
}

module.exports = errorHandler;