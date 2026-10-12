const app = require('./app');
const config = require('./config');
const { initDb } = require('../db');

// Ensure database tables exist
initDb();

const server = app.listen(config.port, () => {
  console.log(`Nayra Connect server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv} | Database Client: ${config.dbClient}`);
});

module.exports = server;
