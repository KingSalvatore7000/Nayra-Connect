const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { VALID_CASE_TYPES } = require('../middleware/validate');

const router = express.Router();

// All lawyer endpoints require authentication
router.use(authMiddleware);

/**
 * GET /api/lawyers
 * List all lawyers with specializations, capacity, availability, and active openCases count
 */
router.get('/', (req, res) => {
  const db = getDb();
  const lawyers = db.all(`
    SELECT
      l.id,
      l.user_id,
      u.name,
      u.email,
      l.capacity,
      l.available,
      COALESCE(
        (SELECT COUNT(*) FROM cases c WHERE c.lawyer_id = l.id AND c.status != 'Closed'),
        0
      ) as openCases
    FROM lawyers l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.id ASC
  `);

  const specRows = db.all('SELECT lawyer_id, case_type FROM lawyer_specializations');
  const specMap = {};
  for (const s of specRows) {
    if (!specMap[s.lawyer_id]) {
      specMap[s.lawyer_id] = [];
    }
    specMap[s.lawyer_id].push(s.case_type);
  }

  const result = lawyers.map(l => ({
    id: l.id,
    user_id: l.user_id,
    name: l.name,
    email: l.email,
    capacity: l.capacity,
    available: Boolean(l.available),
    openCases: Number(l.openCases),
    specializations: specMap[l.id] || []
  }));

  return res.json({ lawyers: result });
});

/**
 * POST /api/lawyers
 * Coordinator-only endpoint to create a new lawyer
 */
router.post('/', requireRole('coordinator'), (req, res) => {
  const { name, email, password = 'Lawyer@123', capacity = 5, available = true, specializations = [] } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const numCapacity = parseInt(capacity, 10);
  if (isNaN(numCapacity) || numCapacity <= 0) {
    return res.status(400).json({ error: 'Capacity must be an integer greater than 0' });
  }

  const db = getDb();
  const existingUser = db.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  if (existingUser) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  // Validate specializations if provided
  const validSpecs = [];
  if (Array.isArray(specializations)) {
    for (const spec of specializations) {
      const normalized = String(spec).trim().toLowerCase();
      if (VALID_CASE_TYPES.includes(normalized) && !validSpecs.includes(normalized)) {
        validSpecs.push(normalized);
      }
    }
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userResult = db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), passwordHash, 'lawyer']
  );
  const userId = userResult.lastInsertRowid;

  const lawyerResult = db.run(
    'INSERT INTO lawyers (user_id, capacity, available) VALUES (?, ?, ?)',
    [userId, numCapacity, available ? 1 : 0]
  );
  const lawyerId = lawyerResult.lastInsertRowid;

  for (const spec of validSpecs) {
    db.run(
      'INSERT INTO lawyer_specializations (lawyer_id, case_type) VALUES (?, ?)',
      [lawyerId, spec]
    );
  }

  return res.status(201).json({
    message: 'Lawyer profile created successfully',
    lawyer: {
      id: lawyerId,
      user_id: userId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      capacity: numCapacity,
      available: Boolean(available),
      openCases: 0,
      specializations: validSpecs
    }
  });
});

/**
 * PATCH /api/lawyers/:id
 * Coordinator-only endpoint to update lawyer capacity, availability, or specializations
 */
router.patch('/:id', requireRole('coordinator'), (req, res) => {
  const lawyerId = parseInt(req.params.id, 10);
  if (isNaN(lawyerId)) {
    return res.status(400).json({ error: 'Invalid lawyer id' });
  }

  const db = getDb();
  const lawyer = db.get('SELECT * FROM lawyers WHERE id = ?', [lawyerId]);
  if (!lawyer) {
    return res.status(404).json({ error: 'Lawyer not found' });
  }

  const { capacity, available, specializations } = req.body;

  if (capacity !== undefined) {
    const numCapacity = parseInt(capacity, 10);
    if (isNaN(numCapacity) || numCapacity <= 0) {
      return res.status(400).json({ error: 'Capacity must be an integer greater than 0' });
    }
    db.run('UPDATE lawyers SET capacity = ? WHERE id = ?', [numCapacity, lawyerId]);
  }

  if (available !== undefined) {
    const isAvail = available === true || available === 1 || available === 'true';
    db.run('UPDATE lawyers SET available = ? WHERE id = ?', [isAvail ? 1 : 0, lawyerId]);
  }

  if (specializations !== undefined && Array.isArray(specializations)) {
    db.run('DELETE FROM lawyer_specializations WHERE lawyer_id = ?', [lawyerId]);
    for (const spec of specializations) {
      const normalized = String(spec).trim().toLowerCase();
      if (VALID_CASE_TYPES.includes(normalized)) {
        db.run(
          'INSERT OR IGNORE INTO lawyer_specializations (lawyer_id, case_type) VALUES (?, ?)',
          [lawyerId, normalized]
        );
      }
    }
  }

  // Fetch updated lawyer
  const updatedLawyer = db.get(`
    SELECT
      l.id,
      l.user_id,
      u.name,
      u.email,
      l.capacity,
      l.available,
      COALESCE(
        (SELECT COUNT(*) FROM cases c WHERE c.lawyer_id = l.id AND c.status != 'Closed'),
        0
      ) as openCases
    FROM lawyers l
    JOIN users u ON l.user_id = u.id
    WHERE l.id = ?
  `, [lawyerId]);

  const specs = db.all('SELECT case_type FROM lawyer_specializations WHERE lawyer_id = ?', [lawyerId])
    .map(r => r.case_type);

  return res.json({
    message: 'Lawyer profile updated successfully',
    lawyer: {
      id: updatedLawyer.id,
      user_id: updatedLawyer.user_id,
      name: updatedLawyer.name,
      email: updatedLawyer.email,
      capacity: updatedLawyer.capacity,
      available: Boolean(updatedLawyer.available),
      openCases: Number(updatedLawyer.openCases),
      specializations: specs
    }
  });
});

module.exports = router;
