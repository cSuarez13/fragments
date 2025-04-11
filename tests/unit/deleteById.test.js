// tests/unit/deleteById.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('DELETE /v1/fragments/:id', () => {
  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
    Fragment.delete.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).delete('/v1/fragments/123').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .delete('/v1/fragments/123')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Test successful deletion
  test('authenticated users can delete their fragments', async () => {
    // Mock a fragment
    const mockFragment = {
      id: 'fragment-id',
      ownerId: 'test-owner',
    };

    // Mock Fragment.byId to return our test fragment
    Fragment.byId.mockResolvedValue(mockFragment);

    // Mock Fragment.delete to return undefined (successful deletion)
    Fragment.delete.mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/v1/fragments/fragment-id')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');

    // Verify Fragment.byId and Fragment.delete were called with the correct params
    expect(Fragment.byId).toHaveBeenCalledWith(expect.any(String), 'fragment-id');
    expect(Fragment.delete).toHaveBeenCalledWith(expect.any(String), 'fragment-id');
  });

  // Test fragment not found
  test('returns 404 for non-existent fragment', async () => {
    // Mock Fragment.byId to return null (fragment not found)
    Fragment.byId.mockResolvedValue(null);

    const res = await request(app)
      .delete('/v1/fragments/non-existent')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');

    // Verify Fragment.delete was not called
    expect(Fragment.delete).not.toHaveBeenCalled();
  });

  // Test server error during deletion
  test('returns 500 when server error occurs', async () => {
    // Mock a fragment
    const mockFragment = {
      id: 'fragment-id',
      ownerId: 'test-owner',
    };

    // Mock Fragment.byId to return our test fragment
    Fragment.byId.mockResolvedValue(mockFragment);

    // Mock Fragment.delete to throw an error
    Fragment.delete.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .delete('/v1/fragments/fragment-id')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Database error');
  });
});
