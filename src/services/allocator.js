/**
 * Pure Case Allocation Engine for Nayra Connect.
 * Matches incoming legal cases to volunteer lawyers based on specializations,
 * remaining workload capacity, and availability fit.
 *
 * Guaranteed to have zero side-effects and zero database interactions.
 */

function isLawyerEligible(lawyer, caseType) {
  if (!lawyer || !lawyer.available || !Array.isArray(lawyer.specializations)) {
    return false;
  }
  const capacity = Number(lawyer.capacity);
  const openCases = Number(lawyer.openCases || 0);

  if (capacity <= 0 || openCases >= capacity) {
    return false;
  }

  const hasSpecialization = lawyer.specializations.some(
    spec => typeof spec === 'string' && spec.toLowerCase() === caseType
  );

  return hasSpecialization;
}

function calculateScore(lawyer) {
  const capacity = Number(lawyer.capacity);
  const openCases = Number(lawyer.openCases || 0);
  const availabilityFit = typeof lawyer.availabilityFit === 'number'
    ? lawyer.availabilityFit
    : 1.0;

  const workloadRatio = openCases / capacity;
  return (0.6 * (1 - workloadRatio)) + (0.4 * availabilityFit);
}

function compareCandidates(a, b) {
  const scoreDiff = b.score - a.score;
  if (Math.abs(scoreDiff) > 1e-6) {
    return scoreDiff;
  }

  const openCasesDiff = a.openCases - b.openCases;
  if (openCasesDiff !== 0) {
    return openCasesDiff;
  }

  return a.id - b.id;
}

/**
 * Pure function to allocate a legal case to the most suitable eligible lawyer.
 *
 * @param {Object} caseData - The case object containing case_type
 * @param {Array<Object>} lawyers - Array of candidate lawyer profiles
 * @returns {Object|null} The chosen lawyer profile or null if no eligible lawyer
 */
function allocateCase(caseData, lawyers) {
  if (!caseData || !caseData.case_type || !Array.isArray(lawyers) || lawyers.length === 0) {
    return null;
  }

  const caseType = String(caseData.case_type).trim().toLowerCase();

  const scoredLawyers = [];
  for (const lawyer of lawyers) {
    if (isLawyerEligible(lawyer, caseType)) {
      const openCases = Number(lawyer.openCases || 0);
      const score = calculateScore(lawyer);
      scoredLawyers.push({
        ...lawyer,
        openCases,
        score
      });
    }
  }

  if (scoredLawyers.length === 0) {
    return null;
  }

  scoredLawyers.sort(compareCandidates);
  return scoredLawyers[0];
}

module.exports = {
  allocateCase,
  isLawyerEligible,
  calculateScore,
  compareCandidates
};
