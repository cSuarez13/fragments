// tests/unit/getVersionById.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('GET /v1/fragments/:id/versions/:versionId', () => {
  const testFragment = {
    id: 'test-fragment-id',
    ownerId: 'test-owner',
    created: '2023-01-01',
    updated: '2023-01-01',
    type: 'text/plain',
    size: 10,
    getVersion: jest.fn(),
  };

  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
    testFragment.getVersion.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/123/versions/123_v1').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/123/versions/123_v1')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  // Test successful retrieval
  test('returns version data when version exists', async () => {
    Fragment.byId.mockResolvedValue(testFragment);

    const versionData = {
      metadata: {
        id: 'test-fragment-id_v1',
        fragmentId: 'test-fragment-id',
        ownerId: 'test-owner',
        created: '2023-01-01',
        type: 'text/plain',
        size: 10,
        versionNum: 1,
      },
      data: Buffer.from('Version 1 content'),
    };

    testFragment.getVersion.mockResolvedValue(versionData);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions/test-fragment-id_v1')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe('Version 1 content');

    // Verify getVersion was called with correct version ID
    expect(testFragment.getVersion).toHaveBeenCalledWith('test-fragment-id_v1');
  });

  // Test fragment not found
  test('returns 404 when fragment not found', async () => {
    Fragment.byId.mockResolvedValue(null);

    const res = await request(app)
      .get('/v1/fragments/non-existent/versions/non-existent_v1')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Fragment not found');
    expect(testFragment.getVersion).not.toHaveBeenCalled();
  });

  // Test version not found
  test('returns 404 when version not found', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.getVersion.mockResolvedValue(null);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions/test-fragment-id_v999')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Version not found');
  });

  // Test invalid version ID format
  test('returns 404 when version ID format is invalid', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.getVersion.mockResolvedValue(null);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions/invalid-version-format')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Version not found');
  });

  // Test server error during version retrieval
  test('returns 500 when server error occurs', async () => {
    Fragment.byId.mockResolvedValue(testFragment);
    testFragment.getVersion.mockRejectedValue(new Error('Database error'));

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions/test-fragment-id_v1')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Unable to retrieve fragment version');
  });

  // Test binary data (image) version
  test('handles binary data versions correctly', async () => {
    Fragment.byId.mockResolvedValue({
      ...testFragment,
      type: 'image/png',
    });

    const imageBuffer = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG file signature
    const versionData = {
      metadata: {
        id: 'test-fragment-id_v1',
        fragmentId: 'test-fragment-id',
        ownerId: 'test-owner',
        created: '2023-01-01',
        type: 'image/png',
        size: imageBuffer.length,
        versionNum: 1,
      },
      data: imageBuffer,
    };

    testFragment.getVersion.mockResolvedValue(versionData);

    const res = await request(app)
      .get('/v1/fragments/test-fragment-id/versions/test-fragment-id_v1')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');

    // Convert response buffer to array for comparison
    const responseBuffer = Buffer.from(res.body);
    expect(responseBuffer).toEqual(imageBuffer);
  });
});
