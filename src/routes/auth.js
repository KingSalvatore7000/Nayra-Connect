const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDb } = require('../../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

const router = express.Router();

/**
 * POST /api/auth/login
 * Public endpoint to authenticate users and generate JWT
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  let lawyerId = null;
  if (user.role === 'lawyer') {
    const lawyer = db.get('SELECT id FROM lawyers WHERE user_id = ?', [user.id]);
    if (lawyer) {
      lawyerId = lawyer.id;
    }
  }

  const tokenPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    lawyer_id: lawyerId
  };

  const token = jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });

  return res.json({
    message: 'Login successful',
    token,
    user: tokenPayload
  });
});

/**
 * POST /api/auth/register
 * Coordinator-only endpoint after first coordinator is created
 */
router.post('/register', (req, res, next) => {
  const db = getDb();
  const userCountRow = db.get('SELECT COUNT(*) as count FROM users');
  const userCount = userCountRow ? userCountRow.count : 0;

  // If users already exist, require authenticated coordinator
  if (userCount > 0) {
    return authMiddleware(req, res, () => {
      requireRole('coordinator')(req, res, () => {
        handleRegister(req, res);
      });
    });
  }

  // Initial user registration
  return handleRegister(req, res);
});

function handleRegister(req, res) {
  const { name, email, password, role = 'lawyer', capacity = 5, specializations = [] } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const normalizedRole = role.toLowerCase();
  if (!['coordinator', 'lawyer'].includes(normalizedRole)) {
    return res.status(400).json({ error: 'Role must be either "coordinator" or "lawyer"' });
  }

  const db = getDb();
  const existing = db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userResult = db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), passwordHash, normalizedRole]
  );
  const userId = userResult.lastInsertRowid;

  let lawyerId = null;
  if (normalizedRole === 'lawyer') {
    const lawyerResult = db.run(
      'INSERT INTO lawyers (user_id, capacity, available) VALUES (?, ?, 1)',
      [userId, parseInt(capacity, 10) || 5]
    );
    lawyerId = lawyerResult.lastInsertRowid;

    if (Array.isArray(specializations) && specializations.length > 0) {
      for (const spec of specializations) {
        db.run(
          'INSERT INTO lawyer_specializations (lawyer_id, case_type) VALUES (?, ?)',
          [lawyerId, spec.trim().toLowerCase()]
        );
      }
    }
  }

  return res.status(201).json({
    message: 'User registered successfully',
    user: {
      id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: normalizedRole,
      lawyer_id: lawyerId
    }
  });
}

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;
