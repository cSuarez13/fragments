// tests/unit/restoreVersion.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('POST /v1/fragments/:id/versions', () => {
  const testFragment = {
    id: 'test-fragment-id',
    ownerId: 'test-owner',
    created: '2023-01-01',
    updated: '2023-01-01',
    type: 'text/plain',
    size: 10,
    restoreVersion: jest.fn(),
  };

  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
    testFragment.restoreVersion.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).post('/v1/fragments/test-id/versions').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .post('/v1/fragments/test-id/versions')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Test successful restoration
  test('successfully restores a fragment to a specified version', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.restoreVersion.mockResolvedValue(true);

    const res = await request(app)
      .post('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send({ versionId: 'test-fragment-id_v1' });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment).toEqual(testFragment);

    // Verify restoreVersion was called with the correct version ID
    expect(testFragment.restoreVersion).toHaveBeenCalledWith('test-fragment-id_v1');
  });

  // Test missing versionId
  test('returns 400 when versionId is missing', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const res = await request(app)
      .post('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Missing versionId in request body');

    // Verify restoreVersion was not called
    expect(testFragment.restoreVersion).not.toHaveBeenCalled();
  });

  // Test fragment not found
  test('returns 404 when fragment not found', async () => {
    Fragment.byId.mockResolvedValue(null);

    const res = await request(app)
      .post('/v1/fragments/non-existent-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send({ versionId: 'test-fragment-id_v1' });

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
  });

  // Test version belonging to different fragment
  test('returns 400 when version does not belong to fragment', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.restoreVersion.mockRejectedValue(
      new Error('Version does not belong to this fragment')
    );

    const res = await request(app)
      .post('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send({ versionId: 'different-fragment-id_v1' });

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Version does not belong to this fragment');
  });

  // Test invalid version ID format
  test('returns 400 when version ID format is invalid', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.restoreVersion.mockRejectedValue(new Error('Invalid version ID format'));

    const res = await request(app)
      .post('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send({ versionId: 'invalid-version-format' });

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Invalid version ID format');
  });

  // Test version not found
  test('returns 404 when version not found', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.restoreVersion.mockRejectedValue(new Error('Version data not found'));

    const res = await request(app)
      .post('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send({ versionId: 'test-fragment-id_v999' });

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Version not found');
  });

  // Test generic server error
  test('returns 500 when unexpected error occurs', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.restoreVersion.mockRejectedValue(new Error('Unexpected server error'));

    const res = await request(app)
      .post('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send({ versionId: 'test-fragment-id_v1' });

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe(
      'Error restoring fragment version: Unexpected server error'
    );
  });

  // Test non-JSON content type
  test('handles non-JSON content type correctly', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const res = await request(app)
      .post('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('versionId=test-fragment-id_v1');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
  });
});
