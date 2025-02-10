// tests/unit/getFragmentInfo.test.js

const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('GET /v1/fragments/:id/info', () => {
  const testFragment = {
    id: 'test-fragment-id',
    ownerId: 'test-owner',
    created: '2023-01-01',
    updated: '2023-01-01',
    type: 'text/plain',
    size: 10,
  };

  beforeEach(() => {
    Fragment.byId.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/123/info').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/123/info')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Test successful metadata retrieval
  test('authenticated users can get fragment metadata', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/info')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toEqual(testFragment);
  });

  // Test fragment not found
  test('returns 404 for non-existent fragment metadata', async () => {
    Fragment.byId.mockResolvedValue(null);

    const res = await request(app)
      .get('/v1/fragments/non-existent/info')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });

  // Test server error
  test('returns 500 for server errors', async () => {
    Fragment.byId.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/info')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
  });

  // Test correct metadata structure
  test('returns all required metadata properties', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/info')
      .auth('user1@email.com', 'password1');

    expect(res.status).toBe(200);
    expect(res.body.fragment).toHaveProperty('id');
    expect(res.body.fragment).toHaveProperty('ownerId');
    expect(res.body.fragment).toHaveProperty('created');
    expect(res.body.fragment).toHaveProperty('updated');
    expect(res.body.fragment).toHaveProperty('type');
    expect(res.body.fragment).toHaveProperty('size');
  });
});
