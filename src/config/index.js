const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'nayra_jwt_secret_key_college_review_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbClient: (process.env.DB_CLIENT || 'sqlite').toLowerCase(),
  dbPath: process.env.DB_PATH || './db/nayra.db',
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nayra_connect',
    port: parseInt(process.env.DB_PORT, 10) || 3306
  }
};
