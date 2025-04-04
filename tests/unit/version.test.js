// tests/unit/version.test.js

const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('Fragment Versioning', () => {
  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
  });

  describe('GET /v1/fragments/:id/versions', () => {
    // Test authentication
    test('unauthenticated requests are denied', () =>
      request(app).get('/v1/fragments/fragment-id/versions').expect(401));

    test('incorrect credentials are denied', () =>
      request(app)
        .get('/v1/fragments/fragment-id/versions')
        .auth('invalid@email.com', 'incorrect_password')
        .expect(401));

    test('should return 404 for non-existent fragment', async () => {
      // Mock Fragment.byId to return null (fragment not found)
      Fragment.byId.mockResolvedValue(null);

      const res = await request(app)
        .get('/v1/fragments/non-existent-id/versions')
        .auth('user1@email.com', 'password1');

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe('error');
    });

    test('should return versions for a fragment', async () => {
      // Mock a fragment
      const mockFragment = {
        id: 'fragment-id',
        getVersions: jest.fn().mockResolvedValue(['version1_v1', 'version1_v2']),
      };

      // Mock Fragment.byId to return our test fragment
      Fragment.byId.mockResolvedValue(mockFragment);

      const res = await request(app)
        .get('/v1/fragments/fragment-id/versions')
        .auth('user1@email.com', 'password1');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.versions).toEqual(['version1_v1', 'version1_v2']);
      expect(mockFragment.getVersions).toHaveBeenCalledWith(false);
    });

    test('should return expanded versions when expand=1', async () => {
      // Mock a fragment
      const expandedVersions = [
        {
          id: 'fragment-id_v1',
          fragmentId: 'fragment-id',
          versionNum: 1,
          type: 'text/plain',
          size: 100,
        },
        {
          id: 'fragment-id_v2',
          fragmentId: 'fragment-id',
          versionNum: 2,
          type: 'text/plain',
          size: 120,
        },
      ];

      const mockFragment = {
        id: 'fragment-id',
        getVersions: jest.fn().mockResolvedValue(expandedVersions),
      };

      // Mock Fragment.byId to return our test fragment
      Fragment.byId.mockResolvedValue(mockFragment);

      const res = await request(app)
        .get('/v1/fragments/fragment-id/versions?expand=1')
        .auth('user1@email.com', 'password1');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.versions).toEqual(expandedVersions);
      expect(mockFragment.getVersions).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /v1/fragments/:id/versions/:versionId', () => {
    test('unauthenticated requests are denied', () =>
      request(app).get('/v1/fragments/fragment-id/versions/version-id').expect(401));

    test('should return 404 for non-existent version', async () => {
      // Mock a fragment
      const mockFragment = {
        id: 'fragment-id',
        getVersion: jest.fn().mockResolvedValue(null),
      };

      // Mock Fragment.byId to return our test fragment
      Fragment.byId.mockResolvedValue(mockFragment);

      const res = await request(app)
        .get('/v1/fragments/fragment-id/versions/non-existent-version')
        .auth('user1@email.com', 'password1');

      expect(res.statusCode).toBe(404);
      expect(res.body.status).toBe('error');
    });

    test('should return version data', async () => {
      // Mock version data and metadata
      const versionMetadata = {
        id: 'fragment-id_v1',
        fragmentId: 'fragment-id',
        versionNum: 1,
        type: 'text/plain',
        size: 13,
      };

      const versionData = Buffer.from('Hello version');

      // Mock a fragment
      const mockFragment = {
        id: 'fragment-id',
        getVersion: jest.fn().mockResolvedValue({
          metadata: versionMetadata,
          data: versionData,
        }),
      };

      // Mock Fragment.byId to return our test fragment
      Fragment.byId.mockResolvedValue(mockFragment);

      const res = await request(app)
        .get('/v1/fragments/fragment-id/versions/fragment-id_v1')
        .auth('user1@email.com', 'password1');

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.text).toBe('Hello version');
      expect(mockFragment.getVersion).toHaveBeenCalledWith('fragment-id_v1');
    });
  });

  describe('POST /v1/fragments/:id/versions', () => {
    test('unauthenticated requests are denied', () =>
      request(app).post('/v1/fragments/fragment-id/versions').expect(401));

    test('should return 400 if versionId is missing', async () => {
      // Mock Fragment.byId to return a fragment
      Fragment.byId.mockResolvedValue({
        id: 'fragment-id',
        restoreVersion: jest.fn(),
      });

      const res = await request(app)
        .post('/v1/fragments/fragment-id/versions')
        .auth('user1@email.com', 'password1')
        .set('Content-Type', 'application/json') // Explicitly set Content-Type
        .send({}); // Empty JSON object

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.error.message).toContain('Missing versionId');
    });

    test('should restore a fragment to a specific version', async () => {
      // Mock a fragment
      const mockFragment = {
        id: 'fragment-id',
        ownerId: 'test-owner',
        type: 'text/plain',
        size: 100,
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-02T00:00:00Z',
        restoreVersion: jest.fn().mockResolvedValue(true),
      };

      // Mock Fragment.byId to return our test fragment
      Fragment.byId.mockResolvedValue(mockFragment);

      const res = await request(app)
        .post('/v1/fragments/fragment-id/versions')
        .auth('user1@email.com', 'password1')
        .set('Content-Type', 'application/json') // Explicitly set Content-Type
        .send({ versionId: 'fragment-id_v1' }); // JSON with versionId

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.fragment).toBeDefined();
      expect(mockFragment.restoreVersion).toHaveBeenCalledWith('fragment-id_v1');
    });
  });
});
