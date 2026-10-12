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

describe('Lawyers API Integration (/api/lawyers)', () => {
  describe('Positive Scenarios', () => {
    test('TC-LAW-01: Retrieves list of lawyers with specializations and openCases count', async () => {
      const res = await request(app)
        .get('/api/lawyers')
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.lawyers)).toBe(true);
      expect(res.body.lawyers.length).toBeGreaterThan(0);

      const lawyer1 = res.body.lawyers[0];
      expect(lawyer1).toHaveProperty('openCases');
      expect(lawyer1).toHaveProperty('capacity');
      expect(Array.isArray(lawyer1.specializations)).toBe(true);
    });

    test('TC-LAW-02: Coordinator creates a new lawyer profile with specializations', async () => {
      const res = await request(app)
        .post('/api/lawyers')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          name: 'Adv. Sneha Roy',
          email: 'sneha.roy@nayra.test',
          capacity: 4,
          available: true,
          specializations: ['family', 'consumer']
        });

      expect(res.status).toBe(201);
      expect(res.body.lawyer.name).toBe('Adv. Sneha Roy');
      expect(res.body.lawyer.specializations).toEqual(['family', 'consumer']);
    });

    test('TC-LAW-03: Coordinator updates capacity and availability of an existing lawyer', async () => {
      const listRes = await request(app)
        .get('/api/lawyers')
        .set('Authorization', `Bearer ${coordToken}`);
      const targetLawyerId = listRes.body.lawyers[0].id;

      const res = await request(app)
        .patch(`/api/lawyers/${targetLawyerId}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          capacity: 8,
          available: false
        });

      expect(res.status).toBe(200);
      expect(res.body.lawyer.capacity).toBe(8);
      expect(res.body.lawyer.available).toBe(false);
    });
  });

  describe('Negative & Boundary Scenarios', () => {
    test('TC-LAW-04: Non-coordinator is rejected from creating lawyer (403)', async () => {
      const res = await request(app)
        .post('/api/lawyers')
        .set('Authorization', `Bearer ${lawyerToken}`)
        .send({
          name: 'Adv. Fake',
          email: 'fake@nayra.test',
          capacity: 5
        });

      expect(res.status).toBe(403);
    });

    test('TC-LAW-05: Rejects creating lawyer with non-positive capacity (400)', async () => {
      const res = await request(app)
        .post('/api/lawyers')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          name: 'Adv. Zero Cap',
          email: 'zerocap@nayra.test',
          capacity: 0
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/greater than 0/i);
    });

    test('TC-LAW-06: Rejects updating non-existent lawyer (404)', async () => {
      const res = await request(app)
        .patch('/api/lawyers/9999')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ capacity: 5 });

      expect(res.status).toBe(404);
    });
  });
});
