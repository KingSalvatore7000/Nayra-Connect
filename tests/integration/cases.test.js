const request = require('supertest');
const app = require('../../src/app');
const { seedDatabase } = require('../../db/seed');

let coordToken;
let lawyer1Token;
let lawyer2Token;

beforeAll(async () => {
  seedDatabase();

  const cLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'coordinator@nayra.test', password: 'Coordinator@123' });
  coordToken = cLogin.body.token;

  const l1Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'lawyer1@nayra.test', password: 'Lawyer@123' });
  lawyer1Token = l1Login.body.token;

  const l2Login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'lawyer2@nayra.test', password: 'Lawyer@123' });
  lawyer2Token = l2Login.body.token;
});

describe('Cases API Integration (/api/cases)', () => {
  describe('Positive Scenarios', () => {
    test('TC-CASE-01: Auto-allocates new bail case to eligible lawyer with target_days=3', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Anil Kumar',
          phone: '9876543210',
          case_type: 'bail',
          priority: 'High',
          description: 'Emergency bail hearing representation required.'
        });

      expect(res.status).toBe(201);
      expect(res.body.allocated).toBe(true);
      expect(res.body.case.status).toBe('Allocated');
      expect(res.body.case.lawyer_id).not.toBeNull();
      expect(res.body.case.target_days).toBe(3);
    });

    test('TC-CASE-02: Auto-assigns default target_days according to case_type (criminal=7, property=30)', async () => {
      const crimRes = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Criminal Case Client',
          phone: '9876543211',
          case_type: 'criminal',
          priority: 'Medium',
          description: 'Drafting quashing petition.'
        });
      expect(crimRes.body.case.target_days).toBe(7);

      const propRes = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Property Case Client',
          phone: '9876543212',
          case_type: 'property',
          priority: 'Low',
          description: 'Land title dispute and boundary resolution.'
        });
      expect(propRes.body.case.target_days).toBe(30);
    });

    test('TC-CASE-03: Coordinator can view all cases while lawyer views only assigned cases', async () => {
      const coordCases = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`);
      expect(coordCases.status).toBe(200);
      expect(coordCases.body.cases.length).toBeGreaterThan(5);

      const l1Cases = await request(app)
        .get('/api/cases')
        .set('Authorization', `Bearer ${lawyer1Token}`);
      expect(l1Cases.status).toBe(200);
      // All returned cases must belong to lawyer1
      for (const c of l1Cases.body.cases) {
        expect(c.lawyer_id).toBe(1);
      }
    });

    test('TC-CASE-04: Coordinator overrides allocation by assigning to a different lawyer', async () => {
      const intakeRes = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Override Test Client',
          phone: '9876543299',
          case_type: 'family',
          priority: 'Medium',
          description: 'Mediation for family dispute.'
        });
      const caseId = intakeRes.body.case.id;

      const overrideRes = await request(app)
        .patch(`/api/cases/${caseId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ lawyer_id: 2 });

      expect(overrideRes.status).toBe(200);
      expect(overrideRes.body.case.lawyer_id).toBe(2);
      expect(overrideRes.body.case.status).toBe('Allocated');
    });

    test('TC-CASE-05: Coordinator unassigns a case by sending null lawyer_id', async () => {
      const intakeRes = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Unassign Test Client',
          phone: '9876543288',
          case_type: 'labor',
          priority: 'Low',
          description: 'Wage claim advice.'
        });
      const caseId = intakeRes.body.case.id;

      const unassignRes = await request(app)
        .patch(`/api/cases/${caseId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ lawyer_id: null });

      expect(unassignRes.status).toBe(200);
      expect(unassignRes.body.case.lawyer_id).toBeNull();
      expect(unassignRes.body.case.status).toBe('Unassigned');
    });
  });

  describe('Negative Scenarios', () => {
    test('TC-CASE-06: Rejects intake with missing client_name (400)', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          phone: '9876543210',
          case_type: 'bail',
          priority: 'High',
          description: 'Missing name'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/client name is required/i);
    });

    test('TC-CASE-07: Rejects intake with invalid phone format (400)', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Bad Phone',
          phone: '98765', // Not 10 digits
          case_type: 'bail',
          priority: 'High',
          description: 'Valid description'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/10-digit number/i);
    });

    test('TC-CASE-08: Rejects intake with invalid case_type (400)', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Bad Type',
          phone: '9876543210',
          case_type: 'intellectual-property', // Not in allowed enum
          priority: 'High',
          description: 'Valid description'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid case_type/i);
    });

    test('TC-CASE-09: Rejects intake with invalid priority (400)', async () => {
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Bad Priority',
          phone: '9876543210',
          case_type: 'bail',
          priority: 'Urgent', // Allowed: Low, Medium, High
          description: 'Valid description'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid priority/i);
    });

    test('TC-CASE-10: Non-coordinator cannot override case assignment (403)', async () => {
      const res = await request(app)
        .patch('/api/cases/1/assign')
        .set('Authorization', `Bearer ${lawyer1Token}`)
        .send({ lawyer_id: 1 });
      expect(res.status).toBe(403);
    });

    test('TC-CASE-11: Rejects override for non-existent lawyer (404)', async () => {
      const allCases = await request(app).get('/api/cases').set('Authorization', `Bearer ${coordToken}`);
      const caseId = allCases.body.cases[0].id;

      const res = await request(app)
        .patch(`/api/cases/${caseId}/assign`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ lawyer_id: 9999 });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/lawyer not found/i);
    });
  });

  describe('Boundary Scenarios', () => {
    test('TC-CASE-12: Accepts description exactly at 1000 characters limit (201)', async () => {
      const exact1000 = 'A'.repeat(1000);
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Boundary Length Client',
          phone: '9876543210',
          case_type: 'bail',
          priority: 'Medium',
          description: exact1000
        });
      expect(res.status).toBe(201);
    });

    test('TC-CASE-13: Rejects description exceeding 1000 characters (400)', async () => {
      const tooLong = 'A'.repeat(1001);
      const res = await request(app)
        .post('/api/cases')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          client_name: 'Exceeding Length Client',
          phone: '9876543210',
          case_type: 'bail',
          priority: 'Medium',
          description: tooLong
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/cannot exceed 1000 characters/i);
    });

    test('TC-CASE-14: Lawyer accessing case assigned to another lawyer is forbidden (403)', async () => {
      const allCases = await request(app).get('/api/cases').set('Authorization', `Bearer ${coordToken}`);
      const otherCase = allCases.body.cases.find(c => c.lawyer_id && c.lawyer_id !== 1);

      const res = await request(app)
        .get(`/api/cases/${otherCase.id}`)
        .set('Authorization', `Bearer ${lawyer1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not assigned to you/i);
    });
  });
});
