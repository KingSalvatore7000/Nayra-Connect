const {
  allocateCase,
  isLawyerEligible,
  calculateScore,
  compareCandidates
} = require('../../src/services/allocator');

describe('Allocation Engine (src/services/allocator.js)', () => {
  describe('Positive Scenarios', () => {
    test('TC-AL-01: Allocates to single eligible lawyer matching specialization', () => {
      const lawyers = [
        { id: 1, name: 'Lawyer A', capacity: 5, openCases: 1, available: true, specializations: ['bail'] }
      ];
      const result = allocateCase({ case_type: 'bail' }, lawyers);
      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
    });

    test('TC-AL-02: Selects lawyer with highest score based on lowest workload ratio', () => {
      const lawyers = [
        { id: 1, name: 'Busy Lawyer', capacity: 5, openCases: 4, available: true, specializations: ['criminal'], availabilityFit: 1.0 },
        { id: 2, name: 'Free Lawyer', capacity: 5, openCases: 1, available: true, specializations: ['criminal'], availabilityFit: 1.0 }
      ];
      const result = allocateCase({ case_type: 'criminal' }, lawyers);
      expect(result.id).toBe(2);
      expect(result.name).toBe('Free Lawyer');
    });

    test('TC-AL-03: Factors availabilityFit into final ranking score', () => {
      // Lawyer 1: workload = 1/5 = 0.2. score = 0.6*(0.8) + 0.4*(0.5) = 0.48 + 0.20 = 0.68
      // Lawyer 2: workload = 2/5 = 0.4. score = 0.6*(0.6) + 0.4*(1.0) = 0.36 + 0.40 = 0.76
      const lawyers = [
        { id: 1, capacity: 5, openCases: 1, available: true, specializations: ['family'], availabilityFit: 0.5 },
        { id: 2, capacity: 5, openCases: 2, available: true, specializations: ['family'], availabilityFit: 1.0 }
      ];
      const result = allocateCase({ case_type: 'family' }, lawyers);
      expect(result.id).toBe(2);
    });

    test('TC-AL-04: Case type matching is case-insensitive', () => {
      const lawyers = [
        { id: 1, capacity: 4, openCases: 0, available: true, specializations: ['Property'] }
      ];
      const result = allocateCase({ case_type: 'property' }, lawyers);
      expect(result).not.toBeNull();
      expect(result.id).toBe(1);
    });
  });

  describe('Negative Scenarios', () => {
    test('TC-AL-05: Returns null when no lawyers match the case specialization', () => {
      const lawyers = [
        { id: 1, capacity: 5, openCases: 0, available: true, specializations: ['property', 'labor'] }
      ];
      const result = allocateCase({ case_type: 'bail' }, lawyers);
      expect(result).toBeNull();
    });

    test('TC-AL-06: Returns null when all matching lawyers are unavailable', () => {
      const lawyers = [
        { id: 1, capacity: 5, openCases: 0, available: false, specializations: ['bail'] }
      ];
      const result = allocateCase({ case_type: 'bail' }, lawyers);
      expect(result).toBeNull();
    });

    test('TC-AL-07: Returns null for invalid or missing case data', () => {
      const lawyers = [{ id: 1, capacity: 5, openCases: 0, available: true, specializations: ['bail'] }];
      expect(allocateCase(null, lawyers)).toBeNull();
      expect(allocateCase({}, lawyers)).toBeNull();
      expect(allocateCase({ case_type: '' }, lawyers)).toBeNull();
    });

    test('TC-AL-08: Returns null when lawyer array is empty or invalid', () => {
      expect(allocateCase({ case_type: 'bail' }, [])).toBeNull();
      expect(allocateCase({ case_type: 'bail' }, null)).toBeNull();
    });
  });

  describe('Boundary and Edge Case Scenarios', () => {
    test('TC-AL-09: Lawyer exactly at capacity (openCases === capacity) is excluded', () => {
      const lawyers = [
        { id: 1, capacity: 3, openCases: 3, available: true, specializations: ['consumer'] }
      ];
      const result = allocateCase({ case_type: 'consumer' }, lawyers);
      expect(result).toBeNull();
    });

    test('TC-AL-10: Lawyer exceeding capacity (openCases > capacity) is excluded', () => {
      const lawyers = [
        { id: 1, capacity: 2, openCases: 3, available: true, specializations: ['consumer'] }
      ];
      const result = allocateCase({ case_type: 'consumer' }, lawyers);
      expect(result).toBeNull();
    });

    test('TC-AL-11: Capacity 0 is strictly guarded against (no division by zero)', () => {
      const lawyers = [
        { id: 1, capacity: 0, openCases: 0, available: true, specializations: ['labor'] }
      ];
      const result = allocateCase({ case_type: 'labor' }, lawyers);
      expect(result).toBeNull();
    });

    test('TC-AL-12: Negative capacity is safely excluded', () => {
      const lawyers = [
        { id: 1, capacity: -2, openCases: 0, available: true, specializations: ['labor'] }
      ];
      const result = allocateCase({ case_type: 'labor' }, lawyers);
      expect(result).toBeNull();
    });

    test('TC-AL-13: Score tie-breaking resolves to lowest openCases', () => {
      // Both score identical 0.6*(1 - 0.5) + 0.4 = 0.70
      // Lawyer 1 has 1/2 cases, Lawyer 2 has 2/4 cases
      const lawyers = [
        { id: 2, capacity: 4, openCases: 2, available: true, specializations: ['bail'], availabilityFit: 1.0 },
        { id: 1, capacity: 2, openCases: 1, available: true, specializations: ['bail'], availabilityFit: 1.0 }
      ];
      const result = allocateCase({ case_type: 'bail' }, lawyers);
      expect(result.id).toBe(1); // Lowest openCases (1 vs 2)
    });

    test('TC-AL-14: Score and openCases tie-breaking resolves to lowest lawyer id', () => {
      // Exactly identical capacity, openCases, availabilityFit, and specialization
      const lawyers = [
        { id: 10, capacity: 5, openCases: 1, available: true, specializations: ['family'], availabilityFit: 1.0 },
        { id: 4, capacity: 5, openCases: 1, available: true, specializations: ['family'], availabilityFit: 1.0 }
      ];
      const result = allocateCase({ case_type: 'family' }, lawyers);
      expect(result.id).toBe(4); // Lower ID wins
    });

    test('TC-AL-15: Selects remaining eligible lawyer when other candidates are capped', () => {
      const lawyers = [
        { id: 1, capacity: 3, openCases: 3, available: true, specializations: ['criminal'] },
        { id: 2, capacity: 4, openCases: 3, available: true, specializations: ['criminal'] }
      ];
      const result = allocateCase({ case_type: 'criminal' }, lawyers);
      expect(result.id).toBe(2);
    });
  });
});
