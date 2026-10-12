const express = require('express');
const { getDb } = require('../../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  validateCaseIntake,
  validateCaseStatus,
  DEFAULT_TARGET_DAYS
} = require('../middleware/validate');
const { allocateCase } = require('../services/allocator');
const { hasScheduleConflict } = require('../services/scheduler');
const { getRiskAnalysis } = require('../services/riskService');

const router = express.Router();

// All case endpoints require authentication
router.use(authMiddleware);

/**
 * Loads lawyers with their specializations and current open cases count
 */
function loadCandidateLawyers(db) {
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

  return lawyers.map(l => ({
    id: l.id,
    user_id: l.user_id,
    name: l.name,
    email: l.email,
    capacity: l.capacity,
    available: Boolean(l.available),
    openCases: Number(l.openCases),
    specializations: specMap[l.id] || []
  }));
}

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
  const enrichedRows = rows.map(r => ({
    ...r,
    risk: getRiskAnalysis(r)
  }));

  return res.json({ cases: enrichedRows });
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

  // Lawyer access restriction
  if (req.user.role === 'lawyer' && caseItem.lawyer_id !== req.user.lawyer_id) {
    return res.status(403).json({ error: 'Access denied: case is not assigned to you' });
  }

  return res.json({
    case: {
      ...caseItem,
      risk: getRiskAnalysis(caseItem)
    }
  });
});

/**
 * POST /api/cases
 * Case intake endpoint with automated case allocation
 */
router.post('/', validateCaseIntake, (req, res) => {
  const { client_name, phone, case_type, description, priority, target_days } = req.body;
  const db = getDb();

  const assignedTargetDays = parseInt(target_days, 10) || DEFAULT_TARGET_DAYS[case_type] || 14;

  // 1. Load active lawyers with openCases count
  const candidateLawyers = loadCandidateLawyers(db);

  // 2. Pure allocation engine
  const matchedLawyer = allocateCase({ case_type }, candidateLawyers);

  let initialStatus = 'Unassigned';
  let assignedLawyerId = null;

  if (matchedLawyer) {
    initialStatus = 'Allocated';
    assignedLawyerId = matchedLawyer.id;
  }

  // 3. Save case to database
  const result = db.run(
    `INSERT INTO cases (client_name, phone, case_type, description, priority, status, lawyer_id, target_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [client_name, phone, case_type, description, priority, initialStatus, assignedLawyerId, assignedTargetDays]
  );

  const newCaseId = result.lastInsertRowid;
  const createdCase = db.get(`
    SELECT
      c.*,
      u.name as lawyer_name,
      u.email as lawyer_email
    FROM cases c
    LEFT JOIN lawyers l ON c.lawyer_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE c.id = ?
  `, [newCaseId]);

  return res.status(201).json({
    message: matchedLawyer
      ? `Case allocated to ${matchedLawyer.name}`
      : 'Case created as Unassigned (no eligible lawyer available)',
    allocated: Boolean(matchedLawyer),
    case: {
      ...createdCase,
      risk: getRiskAnalysis(createdCase)
    }
  });
});

/**
 * PATCH /api/cases/:id/assign
 * Coordinator override endpoint to assign or unassign a lawyer manually
 */
router.patch('/:id/assign', requireRole('coordinator'), (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Invalid case id' });
  }

  const db = getDb();
  const existingCase = db.get('SELECT * FROM cases WHERE id = ?', [caseId]);
  if (!existingCase) {
    return res.status(404).json({ error: 'Case not found' });
  }

  const { lawyer_id } = req.body;

  if (lawyer_id === null || lawyer_id === undefined || lawyer_id === '') {
    db.run("UPDATE cases SET lawyer_id = NULL, status = 'Unassigned' WHERE id = ?", [caseId]);
  } else {
    const numLawyerId = parseInt(lawyer_id, 10);
    if (isNaN(numLawyerId)) {
      return res.status(400).json({ error: 'Invalid lawyer_id' });
    }

    const lawyer = db.get('SELECT * FROM lawyers WHERE id = ?', [numLawyerId]);
    if (!lawyer) {
      return res.status(404).json({ error: 'Lawyer not found' });
    }

    db.run("UPDATE cases SET lawyer_id = ?, status = 'Allocated' WHERE id = ?", [numLawyerId, caseId]);
  }

  const updatedCase = db.get(`
    SELECT
      c.*,
      u.name as lawyer_name,
      u.email as lawyer_email
    FROM cases c
    LEFT JOIN lawyers l ON c.lawyer_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE c.id = ?
  `, [caseId]);

  return res.json({
    message: updatedCase.lawyer_id
      ? `Case successfully assigned to ${updatedCase.lawyer_name}`
      : 'Case successfully unassigned',
    case: {
      ...updatedCase,
      risk: getRiskAnalysis(updatedCase)
    }
  });
});

/**
 * PATCH /api/cases/:id/schedule
 * Schedules a 30-minute consultation slot, rejecting conflicts with 409
 */
router.patch('/:id/schedule', (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Invalid case id' });
  }

  const db = getDb();
  const caseItem = db.get('SELECT * FROM cases WHERE id = ?', [caseId]);
  if (!caseItem) {
    return res.status(404).json({ error: 'Case not found' });
  }

  if (req.user.role === 'lawyer' && caseItem.lawyer_id !== req.user.lawyer_id) {
    return res.status(403).json({ error: 'Access denied: case is not assigned to you' });
  }

  if (!caseItem.lawyer_id) {
    return res.status(400).json({ error: 'Cannot schedule consultation for an unassigned case. Assign a lawyer first.' });
  }

  const { consultation_at } = req.body;
  if (!consultation_at) {
    return res.status(400).json({ error: 'consultation_at datetime is required' });
  }

  const requestedDate = new Date(consultation_at);
  if (isNaN(requestedDate.getTime())) {
    return res.status(400).json({ error: 'Invalid consultation_at datetime format' });
  }

  // Check for existing consultations for this lawyer
  const existingConsultations = db.all(
    "SELECT id, consultation_at FROM cases WHERE lawyer_id = ? AND consultation_at IS NOT NULL AND status != 'Closed'",
    [caseItem.lawyer_id]
  );

  const isConflict = hasScheduleConflict(existingConsultations, requestedDate, caseId);
  if (isConflict) {
    return res.status(409).json({
      error: 'Consultation slot conflict: this lawyer already has a consultation scheduled within 30 minutes of that time'
    });
  }

  const formattedDate = requestedDate.toISOString().replace('T', ' ').substring(0, 19);
  db.run("UPDATE cases SET consultation_at = ?, status = 'Scheduled' WHERE id = ?", [formattedDate, caseId]);

  const updatedCase = db.get(`
    SELECT
      c.*,
      u.name as lawyer_name,
      u.email as lawyer_email
    FROM cases c
    LEFT JOIN lawyers l ON c.lawyer_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE c.id = ?
  `, [caseId]);

  return res.json({
    message: 'Consultation scheduled successfully',
    case: {
      ...updatedCase,
      risk: getRiskAnalysis(updatedCase)
    }
  });
});

/**
 * PATCH /api/cases/:id/status
 * Updates case status (New | Allocated | Unassigned | Scheduled | Closed)
 */
router.patch('/:id/status', validateCaseStatus, (req, res) => {
  const caseId = parseInt(req.params.id, 10);
  if (isNaN(caseId)) {
    return res.status(400).json({ error: 'Invalid case id' });
  }

  const db = getDb();
  const caseItem = db.get('SELECT * FROM cases WHERE id = ?', [caseId]);
  if (!caseItem) {
    return res.status(404).json({ error: 'Case not found' });
  }

  if (req.user.role === 'lawyer' && caseItem.lawyer_id !== req.user.lawyer_id) {
    return res.status(403).json({ error: 'Access denied: case is not assigned to you' });
  }

  const { status } = req.body;
  db.run('UPDATE cases SET status = ? WHERE id = ?', [status, caseId]);

  const updatedCase = db.get(`
    SELECT
      c.*,
      u.name as lawyer_name,
      u.email as lawyer_email
    FROM cases c
    LEFT JOIN lawyers l ON c.lawyer_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE c.id = ?
  `, [caseId]);

  return res.json({
    message: 'Case status updated successfully',
    case: {
      ...updatedCase,
      risk: getRiskAnalysis(updatedCase)
    }
  });
});

module.exports = router;
