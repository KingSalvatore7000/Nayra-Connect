const { hasScheduleConflict } = require('../../src/services/scheduler');

describe('Consultation Scheduler (src/services/scheduler.js)', () => {
  const existing = [
    { id: 1, consultation_at: '2026-03-25T10:00:00.000Z' },
    { id: 2, consultation_at: '2026-03-25T14:00:00.000Z' }
  ];

  describe('Positive Scenarios', () => {
    test('TC-SCHED-01: Allows booking when time slot is well clear of existing consultations', () => {
      // 11:00 AM is 60 minutes after 10:00 AM
      const requested = '2026-03-25T11:00:00.000Z';
      expect(hasScheduleConflict(existing, requested)).toBe(false);
    });

    test('TC-SCHED-02: Allows booking when existing consultations list is empty', () => {
      expect(hasScheduleConflict([], '2026-03-25T10:00:00.000Z')).toBe(false);
    });
  });

  describe('Negative & Conflict Scenarios', () => {
    test('TC-SCHED-03: Detects conflict when requested time is identical to existing slot', () => {
      const requested = '2026-03-25T10:00:00.000Z';
      expect(hasScheduleConflict(existing, requested)).toBe(true);
    });

    test('TC-SCHED-04: Detects conflict when requested time is within 15 minutes of existing slot', () => {
      // 10:15 AM is 15 minutes after 10:00 AM (overlaps with 30-min duration)
      const requested = '2026-03-25T10:15:00.000Z';
      expect(hasScheduleConflict(existing, requested)).toBe(true);
    });

    test('TC-SCHED-05: Detects conflict when requested time is 20 minutes before existing slot', () => {
      // 09:40 AM overlaps with 10:00 AM
      const requested = '2026-03-25T09:40:00.000Z';
      expect(hasScheduleConflict(existing, requested)).toBe(true);
    });
  });

  describe('Boundary Scenarios', () => {
    test('TC-SCHED-06: Time slot exactly 30 minutes after previous booking does not conflict', () => {
      // 10:30 AM is exactly 30 minutes after 10:00 AM
      const requested = '2026-03-25T10:30:00.000Z';
      expect(hasScheduleConflict(existing, requested)).toBe(false);
    });

    test('TC-SCHED-07: Time slot exactly 30 minutes before booking does not conflict', () => {
      // 09:30 AM is exactly 30 minutes before 10:00 AM
      const requested = '2026-03-25T09:30:00.000Z';
      expect(hasScheduleConflict(existing, requested)).toBe(false);
    });

    test('TC-SCHED-08: Re-scheduling the same case does not conflict with itself', () => {
      // Case 1 updating its own time at 10:10 AM
      const requested = '2026-03-25T10:10:00.000Z';
      expect(hasScheduleConflict(existing, requested, 1)).toBe(false);
    });
  });
});
