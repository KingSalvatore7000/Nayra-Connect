const request = require('supertest');
const app = require('../../src/app');
const { seedDatabase } = require('../../db/seed');

beforeAll(() => {
  seedDatabase();
});

describe('Auth Integration API (/api/auth)', () => {
  describe('Positive Scenarios', () => {
    test('TC-AUTH-01: Coordinator logs in with valid credentials and receives JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'coordinator@nayra.test',
          password: 'Coordinator@123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: 'coordinator@nayra.test',
        role: 'coordinator'
      });
    });

    test('TC-AUTH-02: Lawyer logs in with valid credentials and receives lawyer_id', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lawyer1@nayra.test',
          password: 'Lawyer@123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: 'lawyer1@nayra.test',
        role: 'lawyer'
      });
      expect(res.body.user.lawyer_id).not.toBeNull();
    });

    test('TC-AUTH-03: Authenticated user retrieves own profile via GET /api/auth/me', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'coordinator@nayra.test', password: 'Coordinator@123' });
      const token = loginRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('coordinator@nayra.test');
      expect(res.body.user.role).toBe('coordinator');
    });
  });

  describe('Negative Scenarios', () => {
    test('TC-AUTH-04: Fails login with incorrect password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'coordinator@nayra.test',
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    test('TC-AUTH-05: Fails login with unregistered email (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown.user@nayra.test',
          password: 'Coordinator@123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    test('TC-AUTH-06: Fails login when required fields are missing (400)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'coordinator@nayra.test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    test('TC-AUTH-07: Fails access to protected route without Authorization header (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/token required/i);
    });

    test('TC-AUTH-08: Fails access to protected route with invalid token (401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid or expired/i);
    });
  });

  describe('Boundary and Authorization Scenarios', () => {
    test('TC-AUTH-09: Non-coordinator cannot register new users (403)', async () => {
      const lawyerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'lawyer1@nayra.test', password: 'Lawyer@123' });

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${lawyerLogin.body.token}`)
        .send({
          name: 'Hacked User',
          email: 'hacked@nayra.test',
          password: 'Password@123',
          role: 'coordinator'
        });

      expect(res.status).toBe(403);
    });

    test('TC-AUTH-10: Rejects registration with duplicate email (409)', async () => {
      const coordLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'coordinator@nayra.test', password: 'Coordinator@123' });

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${coordLogin.body.token}`)
        .send({
          name: 'Duplicate Coord',
          email: 'coordinator@nayra.test',
          password: 'Password@123',
          role: 'coordinator'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/i);
    });

    test('TC-AUTH-11: Rejects registration with unsupported role (400)', async () => {
      const coordLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'coordinator@nayra.test', password: 'Coordinator@123' });

      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${coordLogin.body.token}`)
        .send({
          name: 'Admin User',
          email: 'admin@nayra.test',
          password: 'Password@123',
          role: 'superuser'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/role must be/i);
    });
  });
});
