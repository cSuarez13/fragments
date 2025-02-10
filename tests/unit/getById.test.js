// tests/unit/getById.test.js

const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('GET /v1/fragments/:id', () => {
  // Sample test data
  const testFragment = {
    id: 'test-fragment-id',
    ownerId: 'test-owner',
    created: '2023-01-01',
    updated: '2023-01-01',
    type: 'text/plain',
    size: 10,
    formats: ['text/plain'],
    getData: jest.fn(),
  };

  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
    testFragment.getData.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/123').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/123')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Test successful retrieval
  test('authenticated users can get their fragments', async () => {
    const fragmentData = Buffer.from('test data');
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.getData.mockResolvedValue(fragmentData);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe('test data');
  });

  // Test fragment not found
  test('returns 404 for non-existent fragment', async () => {
    Fragment.byId.mockResolvedValue(null);

    const res = await request(app)
      .get('/v1/fragments/non-existent')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });

  // Test format conversion error
  test('returns 415 for unsupported conversion format', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id.unsupported')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Cannot convert fragment to unsupported');
  });

  // Test server error
  test('returns 500 for server errors', async () => {
    Fragment.byId.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
  });
});
