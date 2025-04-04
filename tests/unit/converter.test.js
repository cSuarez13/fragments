// tests/unit/converter.test.js
const { convertData, getMimeType } = require('../../src/utils/converter');

// Mock the logger to avoid noise in tests
jest.mock('../../src/logger');

describe('Converter', () => {
  describe('getMimeType()', () => {
    test('returns the correct MIME type for known extensions', () => {
      expect(getMimeType('txt')).toBe('text/plain');
      expect(getMimeType('md')).toBe('text/markdown');
      expect(getMimeType('html')).toBe('text/html');
      expect(getMimeType('json')).toBe('application/json');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('jpg')).toBe('image/jpeg');
      expect(getMimeType('webp')).toBe('image/webp');
    });

    test('returns application/octet-stream for unknown extensions', () => {
      expect(getMimeType('unknown')).toBe('application/octet-stream');
    });
  });

  describe('convertData()', () => {
    test('converts markdown to HTML', async () => {
      const markdown = Buffer.from('# Heading\n\nParagraph', 'utf8');
      const html = await convertData(markdown, 'text/markdown', 'html');

      expect(html.toString()).toContain('<h1>Heading</h1>');
      expect(html.toString()).toContain('<p>Paragraph</p>');
    });

    test('converts markdown to plain text', async () => {
      const markdown = Buffer.from('# Heading\n\nParagraph', 'utf8');
      const text = await convertData(markdown, 'text/markdown', 'txt');

      expect(text.toString()).toBe('# Heading\n\nParagraph');
    });

    test('converts JSON to text', async () => {
      const json = Buffer.from('{"name":"Test","value":123}', 'utf8');
      const text = await convertData(json, 'application/json', 'txt');

      // Should be prettified JSON
      expect(text.toString()).toContain('"name": "Test"');
      expect(text.toString()).toContain('"value": 123');
    });

    test('converts JSON to YAML', async () => {
      const json = Buffer.from('{"name":"Test","value":123}', 'utf8');
      const yaml = await convertData(json, 'application/json', 'yaml');

      expect(yaml.toString()).toContain('name: Test');
      expect(yaml.toString()).toContain('value: 123');
    });

    test('returns original data when target format is the same as source', async () => {
      const text = Buffer.from('Hello World', 'utf8');
      const result = await convertData(text, 'text/plain', 'txt');

      expect(result).toBe(text);
    });
  });
});
