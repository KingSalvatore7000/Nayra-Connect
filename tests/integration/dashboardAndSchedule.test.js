const request = require('supertest');
const app = require('../../src/app');
const { seedDatabase } = require('../../db/seed');

let coordToken;
let lawyerToken;

beforeAll(async () => {
  seedDatabase();

  const cLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'coordinator@nayra.test', password: 'Coordinator@123' });
  coordToken = cLogin.body.token;

  const lLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'lawyer1@nayra.test', password: 'Lawyer@123' });
  lawyerToken = lLogin.body.token;
});

describe('Dashboard and Scheduler Integration API', () => {
  describe('Dashboard Summary (/api/dashboard/summary)', () => {
    test('TC-DASH-01: Coordinator retrieves dashboard summary metrics and charts data', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('statusCounts');
      expect(res.body).toHaveProperty('priorityCounts');
      expect(res.body).toHaveProperty('lawyerLoad');
      expect(res.body).toHaveProperty('atRiskCases');
      expect(Array.isArray(res.body.lawyerLoad)).toBe(true);
      expect(res.body.statusCounts.total).toBeGreaterThan(0);
    });

    test('TC-DASH-02: Non-coordinator is rejected from accessing dashboard summary (403)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${lawyerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Consultation Scheduling (/api/cases/:id/schedule)', () => {
    test('TC-DASH-03: Schedules consultation slot for an allocated case', async () => {
      const allCases = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`);
      const allocatedCase = allCases.body.cases.find(c => c.status === 'Allocated' && c.lawyer_id);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      futureDate.setHours(11, 0, 0, 0);

      const res = await request(app)
        .patch(`/api/cases/${allocatedCase.id}/schedule`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ consultation_at: futureDate.toISOString() });

      expect(res.status).toBe(200);
      expect(res.body.case.status).toBe('Scheduled');
      expect(res.body.case.consultation_at).not.toBeNull();
    });

    test('TC-DASH-04: Rejects conflicting consultation slot with 409 Conflict', async () => {
      const allCases = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`);

      // Case 3 was seeded with a consultation for lawyer3
      const scheduledCase = allCases.body.cases.find(c => c.status === 'Scheduled' && c.consultation_at && c.lawyer_id);

      // Create a second case assigned to the same lawyer
      const secondCaseRes = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Conflict Test Client',
          phone: '9988776611',
          case_type: 'labor',
          priority: 'High',
          description: 'Testing scheduler conflict detection'
        });
      const secondCaseId = secondCaseRes.body.case.id;

      // Assign to the same lawyer
      await request(app)
        .patch(`/api/cases/${secondCaseId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ lawyer_id: scheduledCase.lawyer_id });

      // Attempt to schedule at exactly the same time (+10 minutes within the 30-min window)
      const conflictingTime = new Date(new Date(scheduledCase.consultation_at).getTime() + 10 * 60 * 1000).toISOString();

      const conflictRes = await request(app)
        .patch(`/api/cases/${secondCaseId}/schedule`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ consultation_at: conflictingTime });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error).toMatch(/conflict/i);
    });

    test('TC-DASH-05: Rejects scheduling consultation on an unassigned case (400)', async () => {
      const unassignedRes = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Unassigned Schedule Client',
          phone: '9988776622',
          case_type: 'labor',
          priority: 'Low',
          description: 'Testing unassigned schedule rejection'
        });
      const unassignedId = unassignedRes.body.case.id;

      // Ensure it is unassigned
      await request(app)
        .patch(`/api/cases/${unassignedId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ lawyer_id: null });

      const res = await request(app)
        .patch(`/api/cases/${unassignedId}/schedule`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ consultation_at: new Date().toISOString() });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/unassigned case/i);
    });
  });

  describe('Case Status Update (/api/cases/:id/status)', () => {
    test('TC-DASH-06: Updates case status to Closed', async () => {
      const allCases = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`);
      const caseId = allCases.body.cases[0].id;

      const res = await request(app)
        .patch(`/api/cases/${caseId}/status`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ status: 'Closed' });

      expect(res.status).toBe(200);
      expect(res.body.case.status).toBe('Closed');
    });

    test('TC-DASH-07: Rejects invalid status transition (400)', async () => {
      const allCases = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`);
      const caseId = allCases.body.cases[0].id;

      const res = await request(app)
        .patch(`/api/cases/${caseId}/status`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ status: 'InvalidStatus' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid status/i);
    });
  });
});
