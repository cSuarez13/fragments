// tests/unit/put-route.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('PUT /v1/fragments/:id', () => {
  const testFragment = {
    id: 'test-fragment-id',
    ownerId: 'test-owner',
    created: '2023-01-01',
    updated: '2023-01-01',
    type: 'text/plain',
    size: 10,
    createVersion: jest.fn().mockResolvedValue(undefined),
    setData: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
  };

  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
    testFragment.setData.mockClear();
    testFragment.save.mockClear();
    testFragment.createVersion.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).put('/v1/fragments/123').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .put('/v1/fragments/123')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Test successful update
  test('authenticated users can update their fragments', async () => {
    const responseFragment = {
      id: 'test-fragment-id',
      ownerId: 'test-owner',
      created: '2023-01-01',
      updated: '2023-01-01',
      type: 'text/plain',
      size: 10,
    };

    Fragment.byId.mockResolvedValue(testFragment);

    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Updated fragment content');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toMatchObject(responseFragment);

    // Verify that createVersion was called
    expect(testFragment.createVersion).toHaveBeenCalledTimes(1);
    expect(testFragment.setData).toHaveBeenCalled();
  });

  // Test fragment not found
  test('returns 404 for non-existent fragment', async () => {
    Fragment.byId.mockResolvedValue(null);

    const res = await request(app)
      .put('/v1/fragments/non-existent')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Updated content');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });

  // Test content type mismatch
  test('returns 400 when content type does not match fragment type', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json') // Different from testFragment.type
      .send('{"key": "value"}');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Content-Type cannot be changed after fragment is created');
  });

  // Test server error during update
  test('returns 500 when server error occurs', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.setData.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Updated content');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Database error');
  });

  // Test version creation failure
  test('fails when version creation fails', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.createVersion.mockRejectedValue(new Error('Version creation failed'));

    const res = await request(app)
      .put('/v1/fragments/test-fragment-id')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Updated content');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');

    // Verify createVersion was called and failed
    expect(testFragment.createVersion).toHaveBeenCalledTimes(1);
  });

  // Test with binary data
  test('handles binary data updates', async () => {
    // Clone testFragment and modify its type
    const imageFragment = {
      ...testFragment,
      id: 'image-fragment-id',
      type: 'image/png',
      createVersion: jest.fn().mockResolvedValue(undefined),
      setData: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
    };

    Fragment.byId.mockResolvedValue(imageFragment);

    const pngBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG file signature

    const res = await request(app)
      .put('/v1/fragments/image-fragment-id')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'image/png')
      .send(pngBuffer);

    expect(res.statusCode).toBe(200);
    expect(imageFragment.setData).toHaveBeenCalled();
    expect(imageFragment.createVersion).toHaveBeenCalledTimes(1);
  });
});
