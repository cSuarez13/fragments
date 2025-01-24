const request = require('supertest');

// Import the Express app
const app = require('../../src/app');

describe('404 Middleware', () => {
  test('should return 404 status for an unknown route', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
  });

  test('should return a JSON response with error details', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toEqual({
      status: 'error',
      error: {
        message: 'not found',
        code: 404,
      },
    });
  });
});
