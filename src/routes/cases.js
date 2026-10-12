const express = require('express');
const { getDb } = require('../../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  validateCaseIntake,
  DEFAULT_TARGET_DAYS
} = require('../middleware/validate');

const router = express.Router();

// All case endpoints require authentication
router.use(authMiddleware);

/**
 * GET /api/cases
 * List cases: Coordinator sees all cases; Lawyer sees only their assigned cases
 */
router.get('/', (req, res) => {
  const db = getDb();
  const { status, case_type, priority } = req.query;

  let query = `
    SELECT
      c.id,
      c.client_name,
      c.phone,
      c.case_type,
      c.description,
      c.priority,
      c.status,
      c.lawyer_id,
      c.created_at,
      c.target_days,
      c.consultation_at,
      u.name as lawyer_name,
      u.email as lawyer_email
    FROM cases c
    LEFT JOIN lawyers l ON c.lawyer_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  // Role-based visibility
  if (req.user.role === 'lawyer') {
    if (!req.user.lawyer_id) {
      return res.json({ cases: [] });
    }
    query += ' AND c.lawyer_id = ?';
    params.push(req.user.lawyer_id);
  }

  // Filter queries
  if (status) {
    query += ' AND c.status = ?';
    params.push(status);
  }
  if (case_type) {
    query += ' AND c.case_type = ?';
    params.push(case_type.toLowerCase());
  }
  if (priority) {
    query += ' AND c.priority = ?';
    params.push(priority);
  }

  query += ' ORDER BY c.created_at DESC';

  const rows = db.all(query, params);
  return res.json({ cases: rows });
});

/**
 * GET /api/cases/:id
 * Retrieve single case details
 */
router.get('/:id', (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Invalid case id' });
  }

  const db = getDb();
  const caseItem = db.get(`
    SELECT
      c.id,
      c.client_name,
      c.phone,
      c.case_type,
      c.description,
      c.priority,
      c.status,
      c.lawyer_id,
      c.created_at,
      c.target_days,
      c.consultation_at,
      u.name as lawyer_name,
      u.email as lawyer_email
    FROM cases c
    LEFT JOIN lawyers l ON c.lawyer_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE c.id = ?
  `, [caseId]);

  if (!caseItem) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // Lawyer access restriction: can only view their own assigned cases
  if (req.user.role === 'lawyer' && caseItem.lawyer_id !== req.user.lawyer_id) {
    return res.status(403).json({ error: 'Access denied: case is not assigned to you' });
  }

  return res.json({ case: caseItem });
});

/**
 * POST /api/cases
 * Case intake endpoint with validation and default target_days calculation
 */
router.post('/', validateCaseIntake, (req, res) => {
  const { client_name, phone, case_type, description, priority, target_days } = req.body;
  const db = getDb();

  const assignedTargetDays = parseInt(target_days, 10) || DEFAULT_TARGET_DAYS[case_type] || 14;

  const result = db.run(
    `INSERT INTO cases (client_name, phone, case_type, description, priority, status, lawyer_id, target_days)
     VALUES (?, ?, ?, ?, ?, 'New', NULL, ?)`,
    [client_name, phone, case_type, description, priority, assignedTargetDays]
  );

  const newCaseId = result.lastInsertRowid;
  const createdCase = db.get('SELECT * FROM cases WHERE id = ?', [newCaseId]);

  return res.status(201).json({
    message: 'Case intake submitted successfully',
    case: createdCase
  });
});

module.exports = router;
