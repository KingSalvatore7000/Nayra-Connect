const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDb } = require('../../db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const db = getDb();
    const user = db.get('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    let lawyerId = null;
    if (user.role === 'lawyer') {
      const lawyer = db.get('SELECT id FROM lawyers WHERE user_id = ?', [user.id]);
      if (lawyer) {
        lawyerId = lawyer.id;
      }
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lawyer_id: lawyerId
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = authMiddleware;
