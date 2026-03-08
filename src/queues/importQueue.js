const Bull = require('bull');

const importQueue = new Bull('csv-import', {
  redis: process.env.REDIS_URL || process.env.REDIS_URL_LOCAL,
});

module.exports = importQueue;