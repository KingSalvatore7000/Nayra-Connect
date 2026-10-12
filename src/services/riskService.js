/**
 * Pure Rule-Based TAT Risk Service for Nayra Connect.
 * Evaluates whether walk-in legal cases are at risk of breaching target turnaround time (TAT).
 *
 * Rules:
 * - Closed cases are never at risk ('None').
 * - ratio = daysElapsed / target_days
 * - Low: ratio < 0.5
 * - Medium: 0.5 <= ratio < 0.8
 * - High: ratio >= 0.8 or overdue (daysElapsed >= target_days)
 */

function calculateDaysElapsed(createdAt, now = new Date()) {
  const createdDate = new Date(createdAt);
  const nowDate = now instanceof Date ? now : new Date(now);
  const diffMs = nowDate.getTime() - createdDate.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns the categorical risk level for a case.
 *
 * @param {Object} caseItem - Case record
 * @param {Date|string} [now=new Date()] - Reference timestamp for calculation
 * @returns {'None'|'Low'|'Medium'|'High'} Risk level
 */
function riskLevel(caseItem, now = new Date()) {
  if (!caseItem || typeof caseItem !== 'object') {
    return 'None';
  }

  if (caseItem.status === 'Closed') {
    return 'None';
  }

  const daysElapsed = calculateDaysElapsed(caseItem.created_at, now);
  const targetDays = Number(caseItem.target_days);

  if (isNaN(targetDays) || targetDays <= 0) {
    return 'Low';
  }

  const ratio = daysElapsed / targetDays;

  if (ratio < 0.5) {
    return 'Low';
  }
  if (ratio < 0.8) {
    return 'Medium';
  }
  return 'High';
}

/**
 * Returns comprehensive risk analysis breakdown.
 */
function getRiskAnalysis(caseItem, now = new Date()) {
  const level = riskLevel(caseItem, now);
  const daysElapsed = calculateDaysElapsed(caseItem ? caseItem.created_at : null, now);
  const targetDays = Number(caseItem ? caseItem.target_days : 14) || 14;
  const ratio = targetDays > 0 ? (daysElapsed / targetDays) : 0;

  return {
    level,
    daysElapsed,
    targetDays,
    ratio: Math.round(ratio * 100) / 100,
    isOverdue: level !== 'None' && daysElapsed >= targetDays
  };
}

module.exports = {
  riskLevel,
  getRiskAnalysis,
  calculateDaysElapsed
};
