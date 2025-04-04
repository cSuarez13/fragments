// tests/unit/search.test.js

const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

describe('GET /v1/fragments/search', () => {
  // Sample test data
  const mockFragments = [
    {
      id: 'fragment1',
      type: 'text/plain',
      size: 100,
      created: '2023-01-01T00:00:00Z',
      updated: '2023-01-01T00:00:00Z',
    },
    {
      id: 'fragment2',
      type: 'text/markdown',
      size: 200,
      created: '2023-01-02T00:00:00Z',
      updated: '2023-01-02T00:00:00Z',
    },
    {
      id: 'fragment3',
      type: 'text/plain',
      size: 300,
      created: '2023-01-03T00:00:00Z',
      updated: '2023-01-03T00:00:00Z',
    },
  ];

  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byUser.mockClear();
  });

  // Test authentication
  test('unauthenticated requests are denied', () =>
    request(app).get('/v1/fragments/search?type=text/plain').expect(401));

  test('incorrect credentials are denied', () =>
    request(app)
      .get('/v1/fragments/search?type=text/plain')
      .auth('invalid@email.com', 'incorrect_password')
      .expect(401));

  test('should return an empty array when no fragments match', async () => {
    // Mock the Fragment.byUser method to return an empty list
    Fragment.byUser.mockResolvedValue([]);

    const res = await request(app)
      .get('/v1/fragments/search?type=text/plain')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments).toHaveLength(0);
  });

  test('should return matching fragments when searching by type', async () => {
    // Mock the Fragment.byUser method
    Fragment.byUser.mockResolvedValue(mockFragments);

    const res = await request(app)
      .get('/v1/fragments/search?type=text/plain')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments).toHaveLength(2);
    expect(res.body.fragments).toContain('fragment1');
    expect(res.body.fragments).toContain('fragment3');
    expect(res.body.fragments).not.toContain('fragment2');
  });

  test('should filter by size ranges', async () => {
    // Mock fragments with different sizes
    const sizeFragments = [
      {
        id: 'fragment1',
        type: 'text/plain',
        size: 50,
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: 'fragment2',
        type: 'text/plain',
        size: 150,
        created: '2023-01-02T00:00:00Z',
        updated: '2023-01-02T00:00:00Z',
      },
      {
        id: 'fragment3',
        type: 'text/plain',
        size: 250,
        created: '2023-01-03T00:00:00Z',
        updated: '2023-01-03T00:00:00Z',
      },
    ];

    // Mock the Fragment.byUser method
    Fragment.byUser.mockResolvedValue(sizeFragments);

    // Test minSize filter
    let res = await request(app)
      .get('/v1/fragments/search?minSize=100')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).toHaveLength(2);
    expect(res.body.fragments).toContain('fragment2');
    expect(res.body.fragments).toContain('fragment3');
    expect(res.body.fragments).not.toContain('fragment1');

    // Test maxSize filter
    res = await request(app)
      .get('/v1/fragments/search?maxSize=200')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).toHaveLength(2);
    expect(res.body.fragments).toContain('fragment1');
    expect(res.body.fragments).toContain('fragment2');
    expect(res.body.fragments).not.toContain('fragment3');

    // Test combined size range
    res = await request(app)
      .get('/v1/fragments/search?minSize=75&maxSize=200')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).toHaveLength(1);
    expect(res.body.fragments).toContain('fragment2');
  });

  test('should filter by date ranges', async () => {
    // Mock fragments with different dates
    const dateFragments = [
      {
        id: 'fragment1',
        type: 'text/plain',
        size: 100,
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-05T00:00:00Z',
      },
      {
        id: 'fragment2',
        type: 'text/plain',
        size: 200,
        created: '2023-01-10T00:00:00Z',
        updated: '2023-01-15T00:00:00Z',
      },
      {
        id: 'fragment3',
        type: 'text/plain',
        size: 300,
        created: '2023-01-20T00:00:00Z',
        updated: '2023-01-25T00:00:00Z',
      },
    ];

    // Mock the Fragment.byUser method
    Fragment.byUser.mockResolvedValue(dateFragments);

    // Test 'after' filter
    let res = await request(app)
      .get('/v1/fragments/search?after=2023-01-05T00:00:00Z')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).toHaveLength(2);
    expect(res.body.fragments).toContain('fragment2');
    expect(res.body.fragments).toContain('fragment3');

    // Test 'before' filter
    res = await request(app)
      .get('/v1/fragments/search?before=2023-01-15T00:00:00Z')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).toHaveLength(2);
    expect(res.body.fragments).toContain('fragment1');
    expect(res.body.fragments).toContain('fragment2');

    // Test 'modified' filter
    res = await request(app)
      .get('/v1/fragments/search?modified=2023-01-10T00:00:00Z')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).toHaveLength(2);
    expect(res.body.fragments).toContain('fragment2');
    expect(res.body.fragments).toContain('fragment3');
  });

  test('should support expanded results', async () => {
    // Mock fragments
    const expandedFragments = [
      {
        id: 'fragment1',
        type: 'text/plain',
        size: 100,
        created: '2023-01-01T00:00:00Z',
        updated: '2023-01-01T00:00:00Z',
      },
      {
        id: 'fragment2',
        type: 'text/markdown',
        size: 200,
        created: '2023-01-02T00:00:00Z',
        updated: '2023-01-02T00:00:00Z',
      },
    ];

    // Mock the Fragment.byUser method
    Fragment.byUser.mockResolvedValue(expandedFragments);

    // Test expanded results
    const res = await request(app)
      .get('/v1/fragments/search?expanded=1')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.body.fragments).toHaveLength(2);
    expect(res.body.fragments[0]).toMatchObject(expandedFragments[0]);
    expect(res.body.fragments[1]).toMatchObject(expandedFragments[1]);
  });

  test('should handle invalid query parameters', async () => {
    // Mock fragments
    Fragment.byUser.mockResolvedValue(mockFragments);

    // Test invalid minSize
    let res = await request(app)
      .get('/v1/fragments/search?minSize=notANumber')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Invalid value for "minSize"');

    // Test invalid date format
    res = await request(app)
      .get('/v1/fragments/search?after=notADate')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Invalid date format');
  });
});
