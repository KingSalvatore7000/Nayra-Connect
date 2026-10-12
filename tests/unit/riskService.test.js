const {
  riskLevel,
  getRiskAnalysis,
  calculateDaysElapsed
} = require('../../src/services/riskService');

describe('TAT Risk Service (src/services/riskService.js)', () => {
  const baseDate = new Date('2026-03-20T12:00:00Z');

  describe('Positive Scenarios', () => {
    test('TC-RISK-01: Returns Low risk when ratio < 0.5', () => {
      // Created 2 days ago, target 10 days -> 2/10 = 0.20
      const caseItem = {
        created_at: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 10,
        status: 'Allocated'
      };
      expect(riskLevel(caseItem, baseDate)).toBe('Low');
    });

    test('TC-RISK-02: Returns Medium risk when 0.5 <= ratio < 0.8', () => {
      // Created 6 days ago, target 10 days -> 6/10 = 0.60
      const caseItem = {
        created_at: new Date(baseDate.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 10,
        status: 'Allocated'
      };
      expect(riskLevel(caseItem, baseDate)).toBe('Medium');
    });

    test('TC-RISK-03: Returns High risk when ratio >= 0.8', () => {
      // Created 8 days ago, target 10 days -> 8/10 = 0.80
      const caseItem = {
        created_at: new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 10,
        status: 'Allocated'
      };
      expect(riskLevel(caseItem, baseDate)).toBe('High');
    });

    test('TC-RISK-04: Returns High risk and flags isOverdue when daysElapsed >= target_days', () => {
      // Created 12 days ago, target 10 days -> 12/10 = 1.20
      const caseItem = {
        created_at: new Date(baseDate.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 10,
        status: 'Allocated'
      };
      const analysis = getRiskAnalysis(caseItem, baseDate);
      expect(analysis.level).toBe('High');
      expect(analysis.isOverdue).toBe(true);
    });
  });

  describe('Boundary Scenarios', () => {
    test('TC-RISK-05: Ratio exactly at 0.5 boundary is Medium', () => {
      const caseItem = {
        created_at: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 10,
        status: 'Allocated'
      };
      expect(riskLevel(caseItem, baseDate)).toBe('Medium');
    });

    test('TC-RISK-06: Ratio exactly at 0.8 boundary is High', () => {
      const caseItem = {
        created_at: new Date(baseDate.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 10,
        status: 'Allocated'
      };
      expect(riskLevel(caseItem, baseDate)).toBe('High');
    });

    test('TC-RISK-07: Newly created case (0 days elapsed) is Low risk', () => {
      const caseItem = {
        created_at: baseDate.toISOString(),
        target_days: 7,
        status: 'New'
      };
      expect(riskLevel(caseItem, baseDate)).toBe('Low');
    });
  });

  describe('Negative & Exemption Scenarios', () => {
    test('TC-RISK-08: Closed cases are never at risk regardless of days elapsed', () => {
      // 50 days elapsed on a 3-day target
      const caseItem = {
        created_at: new Date(baseDate.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString(),
        target_days: 3,
        status: 'Closed'
      };
      expect(riskLevel(caseItem, baseDate)).toBe('None');
      const analysis = getRiskAnalysis(caseItem, baseDate);
      expect(analysis.level).toBe('None');
      expect(analysis.isOverdue).toBe(false);
    });

    test('TC-RISK-09: Returns None for null or non-object input', () => {
      expect(riskLevel(null)).toBe('None');
      expect(riskLevel(undefined)).toBe('None');
    });
  });
});
