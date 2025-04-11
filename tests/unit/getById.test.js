// tests/unit/getById.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

// Mock the Fragment class
jest.mock('../../src/model/fragment');

// Mock the converter utility
jest.mock('../../src/utils/converter', () => ({
  convertData: jest.fn(),
  getMimeType: jest.fn().mockImplementation((ext) => {
    const mimeTypes = {
      txt: 'text/plain',
      html: 'text/html',
      json: 'application/json',
      yaml: 'application/yaml',
      png: 'image/png',
      jpg: 'image/jpeg',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }),
}));

// Import after mocking
const { convertData } = require('../../src/utils/converter');

describe('GET /v1/fragments/:id', () => {
  const testFragment = {
    id: 'test-fragment-id',
    ownerId: 'test-owner',
    created: '2023-01-01',
    updated: '2023-01-01',
    type: 'text/plain',
    size: 10,
    formats: ['txt'],
    getData: jest.fn(),
  };

  // Clear mock data before each test
  beforeEach(() => {
    Fragment.byId.mockClear();
    testFragment.getData.mockClear();
    convertData.mockClear();
  });

  // Special case for text/plain to txt
  test('handles text/plain to txt conversion directly', async () => {
    const plainTextContent = 'Plain text content';
    const plainTextFragment = {
      id: 'text-id',
      ownerId: 'test-owner',
      type: 'text/plain',
      size: plainTextContent.length,
      formats: ['txt'],
      getData: jest.fn().mockResolvedValue(Buffer.from(plainTextContent)),
    };

    Fragment.byId.mockResolvedValue(plainTextFragment);

    const res = await request(app)
      .get('/v1/fragments/text-id.txt')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe(plainTextContent);

    expect(convertData).not.toHaveBeenCalled();
  });

  // Error cases
  test('returns 415 for unsupported conversion format', async () => {
    const textFragment = {
      id: 'text-id',
      ownerId: 'test-owner',
      type: 'text/plain',
      size: 15,
      formats: ['txt'],
      getData: jest.fn().mockResolvedValue(Buffer.from('Plain text content')),
    };

    Fragment.byId.mockResolvedValue(textFragment);

    const res = await request(app)
      .get('/v1/fragments/text-id.png')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toBe('Cannot convert fragment to png');
  });

  test('returns 500 when converter throws error', async () => {
    const jsonFragment = {
      id: 'json-id',
      ownerId: 'test-owner',
      type: 'application/json',
      size: 20,
      formats: ['json', 'yaml', 'yml', 'txt'],
      getData: jest.fn().mockResolvedValue(Buffer.from('{"name":"Test"}')),
    };

    Fragment.byId.mockResolvedValue(jsonFragment);
    convertData.mockRejectedValue(new Error('Conversion error'));

    const res = await request(app)
      .get('/v1/fragments/json-id.yaml')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error.message).toContain('Error converting fragment');
  });

  // Edge cases
  test('returns original format when no extension is provided', async () => {
    const content = 'Hello World!';
    const fragment = {
      id: 'test-id',
      ownerId: 'test-owner',
      type: 'text/plain',
      size: content.length,
      formats: ['txt'],
      getData: jest.fn().mockResolvedValue(Buffer.from(content)),
    };

    Fragment.byId.mockResolvedValue(fragment);

    const res = await request(app)
      .get('/v1/fragments/test-id')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe(content);
    expect(convertData).not.toHaveBeenCalled();
  });

  test('respects charset in content type', async () => {
    const content = 'Text with charset';
    const fragmentWithCharset = {
      id: 'charset-id',
      ownerId: 'test-owner',
      type: 'text/plain; charset=utf-8',
      size: content.length,
      formats: ['txt'],
      getData: jest.fn().mockResolvedValue(Buffer.from(content)),
    };

    Fragment.byId.mockResolvedValue(fragmentWithCharset);

    const res = await request(app)
      .get('/v1/fragments/charset-id')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain; charset=utf-8');
    expect(res.text).toBe(content);
  });

  // Test markdown to HTML conversion
  test('converts markdown to HTML', async () => {
    const markdownContent = '# Heading\n\nParagraph';

    const markdownFragment = {
      id: 'md-id',
      ownerId: 'test-owner',
      type: 'text/markdown',
      size: markdownContent.length,
      formats: ['md', 'html', 'txt'],
      getData: jest.fn().mockResolvedValue(Buffer.from(markdownContent)),
    };

    Fragment.byId.mockResolvedValue(markdownFragment);

    const res = await request(app)
      .get('/v1/fragments/md-id.html')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('<h1>Heading</h1>');
    expect(res.text).toContain('<p>Paragraph</p>');

    expect(convertData).not.toHaveBeenCalled();
  });

  // Test JSON to YAML conversion
  test('converts JSON to YAML', async () => {
    const jsonContent = '{"name":"Test","value":123}';
    const yamlContent = 'name: Test\nvalue: 123\n';

    const jsonFragment = {
      id: 'json-id',
      ownerId: 'test-owner',
      type: 'application/json',
      size: jsonContent.length,
      formats: ['json', 'yaml', 'yml', 'txt'],
      getData: jest.fn().mockResolvedValue(Buffer.from(jsonContent)),
    };

    Fragment.byId.mockResolvedValue(jsonFragment);
    convertData.mockResolvedValue(Buffer.from(yamlContent));

    const res = await request(app)
      .get('/v1/fragments/json-id.yaml')
      .auth('user1@email.com', 'password1');

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/yaml');
    expect(res.text).toBe(yamlContent);
    expect(convertData).toHaveBeenCalledWith(expect.any(Buffer), 'application/json', 'yaml');
  });
});
