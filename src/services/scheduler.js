/**
 * Consultation Scheduler Service for Nayra Connect.
 * Enforces 30-minute consultation slot windows per lawyer and detects overlapping conflicts.
 */

const SLOT_DURATION_MINUTES = 30;
const SLOT_DURATION_MS = SLOT_DURATION_MINUTES * 60 * 1000;

/**
 * Checks if a requested consultation time overlaps with existing consultations for the same lawyer.
 *
 * @param {Array<Object>} existingConsultations - Array of case objects having consultation_at and id
 * @param {string|Date} requestedDate - Requested datetime string or Date object
 * @param {number|null} [excludeCaseId=null] - Case ID to ignore (self update)
 * @returns {boolean} True if an overlapping conflict exists within 30 minutes
 */
function hasScheduleConflict(existingConsultations, requestedDate, excludeCaseId = null) {
  if (!Array.isArray(existingConsultations) || existingConsultations.length === 0) {
    return false;
  }

  const requestedTime = new Date(requestedDate).getTime();
  if (isNaN(requestedTime)) {
    throw new Error('Invalid consultation date format');
  }

  for (const item of existingConsultations) {
    if (!item || !item.consultation_at) continue;
    if (excludeCaseId !== null && item.id === excludeCaseId) continue;

    const existTime = new Date(item.consultation_at).getTime();
    if (isNaN(existTime)) continue;

    // Check overlap within 30-minute window
    const diff = Math.abs(requestedTime - existTime);
    if (diff < SLOT_DURATION_MS) {
      return true;
    }
  }

  return false;
}

module.exports = {
  SLOT_DURATION_MINUTES,
  SLOT_DURATION_MS,
  hasScheduleConflict
};
