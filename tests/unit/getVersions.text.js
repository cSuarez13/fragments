// tests/unit/getVersions.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('GET /v1/fragments/:id/versions', () => {
  const testFragment = {
    id: 'test-fragment-id',
    ownerId: 'test-owner',
    created: '2023-01-01',
    updated: '2023-01-01',
    type: 'text/plain',
    size: 10,
    getVersions: jest.fn(),
  };

  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
    testFragment.getVersions.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/123/versions').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/123/versions')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Test successful retrieval
  test('returns version IDs when expand flag is not set', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.getVersions.mockResolvedValue(['version1', 'version2']);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.versions).toEqual(['version1', 'version2']);

    // Verify getVersions was called with expand=false
    expect(testFragment.getVersions).toHaveBeenCalledWith(false);
  });

  test('returns expanded versions when expand=1', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const expandedVersions = [
      {
        id: 'version-id-1',
        fragmentId: 'test-fragment-id',
        ownerId: 'test-owner',
        created: '2023-01-01',
        type: 'text/plain',
        size: 10,
        versionNum: 1,
      },
      {
        id: 'version-id-2',
        fragmentId: 'test-fragment-id',
        ownerId: 'test-owner',
        created: '2023-01-02',
        type: 'text/plain',
        size: 15,
        versionNum: 2,
      },
    ];

    testFragment.getVersions.mockResolvedValue(expandedVersions);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions?expand=1')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.versions).toEqual(expandedVersions);

    // Verify getVersions was called with expand=true
    expect(testFragment.getVersions).toHaveBeenCalledWith(true);
  });

  // Test fragment not found
  test('returns 404 when fragment not found', async () => {
    Fragment.byId.mockResolvedValue(null);

    const res = await request(app)
      .get('/v1/fragments/non-existent/versions')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');

    expect(testFragment.getVersions).not.toHaveBeenCalled();
  });

  // Test server error
  test('returns 500 when server error occurs', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.getVersions.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Database error');
  });

  // Test empty versions list
  test('returns empty array when no versions exist', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.getVersions.mockResolvedValue([]);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.versions).toEqual([]);
  });
});
