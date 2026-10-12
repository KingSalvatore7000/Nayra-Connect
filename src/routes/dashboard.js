const express = require('express');
const { getDb } = require('../../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { getRiskAnalysis, riskLevel } = require('../services/riskService');

const router = express.Router();

// Dashboard summary is restricted to authenticated coordinators
router.use(authMiddleware);
router.use(requireRole('coordinator'));

/**
 * GET /api/dashboard/summary
 * Provides aggregated analytics: status distribution, lawyer workload vs capacity, and at-risk cases
 */
router.get('/summary', (req, res) => {
  const db = getDb();

  // 1. Counts by status
  const statusRows = db.all(`
    SELECT status, COUNT(*) as count
    FROM cases
    GROUP BY status
  `);

  const statusCounts = {
    New: 0,
    Allocated: 0,
    Unassigned: 0,
    Scheduled: 0,
    Closed: 0,
    total: 0
  };

  for (const row of statusRows) {
    if (statusCounts[row.status] !== undefined) {
      statusCounts[row.status] = Number(row.count);
    }
    statusCounts.total += Number(row.count);
  }

  // 2. Counts by priority
  const priorityRows = db.all(`
    SELECT priority, COUNT(*) as count
    FROM cases
    GROUP BY priority
  `);
  const priorityCounts = { High: 0, Medium: 0, Low: 0 };
  for (const row of priorityRows) {
    if (priorityCounts[row.priority] !== undefined) {
      priorityCounts[row.priority] = Number(row.count);
    }
  }

  // 3. Lawyer load summary
  const lawyerRows = db.all(`
    SELECT
      l.id,
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
    ORDER BY openCases DESC, l.id ASC
  `);

  const lawyerLoad = lawyerRows.map(l => {
    const capacity = Number(l.capacity);
    const openCases = Number(l.openCases);
    const utilization = capacity > 0 ? Math.round((openCases / capacity) * 100) : 0;
    return {
      id: l.id,
      name: l.name,
      email: l.email,
      capacity,
      openCases,
      available: Boolean(l.available),
      utilization
    };
  });

  // 4. At-risk and overdue cases
  const allActiveCases = db.all(`
    SELECT
      c.id,
      c.client_name,
      c.phone,
      c.case_type,
      c.priority,
      c.status,
      c.created_at,
      c.target_days,
      c.lawyer_id,
      u.name as lawyer_name
    FROM cases c
    LEFT JOIN lawyers l ON c.lawyer_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE c.status != 'Closed'
    ORDER BY c.created_at ASC
  `);

  const atRiskCases = [];
  for (const c of allActiveCases) {
    const analysis = getRiskAnalysis(c);
    if (analysis.level === 'High' || analysis.isOverdue) {
      atRiskCases.push({
        ...c,
        risk: analysis
      });
    }
  }

  // Sort by highest risk ratio first
  atRiskCases.sort((a, b) => b.risk.ratio - a.risk.ratio);

  return res.json({
    statusCounts,
    priorityCounts,
    lawyerLoad,
    atRiskCount: atRiskCases.length,
    atRiskCases
  });
});

module.exports = router;
