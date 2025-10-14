import request from 'supertest';
import app from '../src/index';

describe('Smoke', () => {
  it('returns 401 for protected route without token', async () => {
    const res = await request(app).get('/api/analytics/org123');
    expect(res.status).toBe(401);
  });
});



