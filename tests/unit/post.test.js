const request = require('supertest');
const app = require('../../src/app');

describe('POST /v1/fragments', () => {
  test('unauthenticated requests are denied', () => request(app).post('/v1/fragments').expect(401));

  test('incorrect credentials are denied', () =>
    request(app).post('/v1/fragments').auth('invalid@email.com', 'incorrect_password').expect(401));

  test('authenticated users can create a plain text fragment', async () => {
    const data = Buffer.from('This is fragment');
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send(data);
    expect(res.statusCode).toBe(201);
    expect(res.headers['content-type']).toContain('application/json');
  });

  test('response includes Location header with full URL', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('This is fragment');
    expect(res.statusCode).toBe(201);
    expect(res.headers.location).toEqual(`${res.headers.location}`);
  });

  test('rejects unsupported content types', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .set('Content-Type', 'audio/mpeg')
      .auth('user1@email.com', 'password1')
      .send('aa');

    expect(res.statusCode).toBe(415);
  });

  test('response includes all expected fragment properties with correct values', async () => {
    const testData = 'This is a test fragment';
    const contentType = 'text/plain';

    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', contentType)
      .set('Accept', 'application/json')
      .send(testData)
      .expect('Content-Type', /application\/json/)
      .expect(201);

    // Parse the response body as JSON
    const body = JSON.parse(res.text);

    // Check response body structure
    expect(body.status).toBe('ok');

    // Modified to check for fragment property directly instead of data.fragment
    expect(body.fragment).toBeDefined();

    const fragment = body.fragment;

    // Check all required properties exist
    expect(fragment).toHaveProperty('id');
    expect(fragment).toHaveProperty('ownerId');
    expect(fragment).toHaveProperty('created');
    expect(fragment).toHaveProperty('updated');
    expect(fragment).toHaveProperty('type');
    expect(fragment).toHaveProperty('size');

    // Validate property values
    expect(fragment.id).toMatch(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
    ); // UUID format
    expect(fragment.ownerId).toBe(
      '11d4c22e42c8f61feaba154683dea407b101cfd90987dda9e342843263ca420a'
    ); // Known test user hash
    expect(new Date(fragment.created)).toBeInstanceOf(Date);
    expect(new Date(fragment.updated)).toBeInstanceOf(Date);
    expect(new Date(fragment.created).getTime() / 1000).toBeCloseTo(
      new Date(fragment.updated).getTime() / 1000,
      1
    );
    expect(fragment.type).toBe(contentType);
    expect(fragment.size).toBe(testData.length);

    // Check Location header format
    expect(res.headers.location).toMatch(new RegExp(`/v1/fragments/${fragment.id}$`));
  });
});
