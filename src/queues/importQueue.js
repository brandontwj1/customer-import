const Bull = require('bull');

let importQueue;

if (process.env.REDIS_URL) {
    importQueue = new Bull('csv-import', {
        redis: process.env.REDIS_URL
    });
} else {
    // Provide a lightweight stub so the app can be imported in test
    // environments without a running Redis instance.
    importQueue = { add: async () => {} };
}

module.exports = importQueue;