const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.Console(),
    ],
});

// Logs method, URL, and status code for every response
function requestLogger(req, res, next) {
    res.on('finish', () => {
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode}`);
    });
    next();
}

module.exports = { logger, requestLogger };