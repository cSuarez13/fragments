// tests/unit/converter.test.js
const { convertData, getMimeType } = require('../../src/utils/converter');

// Mock the required modules
jest.mock('../../src/logger');
jest.mock('sharp', () => {
  // Create a mock implementation of Sharp
  const mockSharp = jest.fn().mockReturnValue({
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    gif: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-converted-image')),
  });
  return mockSharp;
});

jest.mock('js-yaml', () => ({
  dump: jest.fn().mockImplementation((obj) => {
    // Simple mock implementation for YAML dump
    if (typeof obj === 'object') {
      return Object.entries(obj)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
    return String(obj);
  }),
  load: jest.fn().mockImplementation((str) => {
    // Simple mock implementation for YAML load
    const result = {};
    str.split('\n').forEach((line) => {
      const [key, value] = line.split(':').map((part) => part.trim());
      if (key && value) {
        result[key] = value;
      }
    });
    return result;
  }),
}));

describe('Converter', () => {
  describe('getMimeType()', () => {
    test('returns the correct MIME type for known extensions', () => {
      expect(getMimeType('txt')).toBe('text/plain');
      expect(getMimeType('md')).toBe('text/markdown');
      expect(getMimeType('html')).toBe('text/html');
      expect(getMimeType('json')).toBe('application/json');
      expect(getMimeType('yaml')).toBe('application/yaml');
      expect(getMimeType('yml')).toBe('application/yaml');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('jpg')).toBe('image/jpeg');
      expect(getMimeType('jpeg')).toBe('image/jpeg');
      expect(getMimeType('webp')).toBe('image/webp');
      expect(getMimeType('avif')).toBe('image/avif');
      expect(getMimeType('gif')).toBe('image/gif');
    });

    test('returns application/octet-stream for unknown extensions', () => {
      expect(getMimeType('unknown')).toBe('application/octet-stream');
      expect(getMimeType('')).toBe('application/octet-stream');
    });
  });

  describe('convertData()', () => {
    // Markdown conversion tests
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

    test('returns original markdown when target format is md', async () => {
      const markdown = Buffer.from('# Heading\n\nParagraph', 'utf8');
      const result = await convertData(markdown, 'text/markdown', 'md');
      expect(result).toBe(markdown);
    });

    // HTML conversion tests
    test('converts HTML to plain text', async () => {
      const html = Buffer.from('<h1>Title</h1><p>Content</p>', 'utf8');
      const text = await convertData(html, 'text/html', 'txt');
      expect(text.toString()).toBe('Title Content');
    });

    test('returns original HTML when target format is html', async () => {
      const html = Buffer.from('<h1>Title</h1><p>Content</p>', 'utf8');
      const result = await convertData(html, 'text/html', 'html');
      expect(result).toBe(html);
    });

    // CSV conversion tests
    test('converts CSV to JSON', async () => {
      const csv = Buffer.from('name,age\nJohn,30\nJane,25', 'utf8');
      const json = await convertData(csv, 'text/csv', 'json');
      const parsed = JSON.parse(json.toString());
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('John');
      expect(parsed[0].age).toBe('30');
      expect(parsed[1].name).toBe('Jane');
      expect(parsed[1].age).toBe('25');
    });

    test('returns CSV as text when target format is txt', async () => {
      const csv = Buffer.from('name,age\nJohn,30\nJane,25', 'utf8');
      const text = await convertData(csv, 'text/csv', 'txt');
      expect(text).toBe(csv);
    });

    // JSON conversion tests
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

    test('returns original JSON when target format is json', async () => {
      const json = Buffer.from('{"name":"Test","value":123}', 'utf8');
      const result = await convertData(json, 'application/json', 'json');
      expect(result).toBe(json);
    });

    // YAML conversion tests
    test('converts YAML to JSON', async () => {
      const yaml = Buffer.from('name: Test\nvalue: 123', 'utf8');
      const json = await convertData(yaml, 'application/yaml', 'json');
      const parsed = JSON.parse(json.toString());
      expect(parsed.name).toBe('Test');
      expect(parsed.value).toBe('123');
    });

    test('returns YAML as text when target format is txt', async () => {
      const yaml = Buffer.from('name: Test\nvalue: 123', 'utf8');
      const text = await convertData(yaml, 'application/yaml', 'txt');
      expect(text).toBe(yaml);
    });

    // Image conversion tests
    test('converts PNG to JPEG', async () => {
      const png = Buffer.from('mock-png-data');
      const jpeg = await convertData(png, 'image/png', 'jpg');
      expect(jpeg.toString()).toBe('mock-converted-image');
    });

    test('converts JPEG to PNG', async () => {
      const jpeg = Buffer.from('mock-jpeg-data');
      const png = await convertData(jpeg, 'image/jpeg', 'png');
      expect(png.toString()).toBe('mock-converted-image');
    });

    test('converts JPEG to WebP', async () => {
      const jpeg = Buffer.from('mock-jpeg-data');
      const webp = await convertData(jpeg, 'image/jpeg', 'webp');
      expect(webp.toString()).toBe('mock-converted-image');
    });

    test('converts WebP to AVIF', async () => {
      const webp = Buffer.from('mock-webp-data');
      const avif = await convertData(webp, 'image/webp', 'avif');
      expect(avif.toString()).toBe('mock-converted-image');
    });

    test('converts GIF to PNG', async () => {
      const gif = Buffer.from('mock-gif-data');
      const png = await convertData(gif, 'image/gif', 'png');
      expect(png.toString()).toBe('mock-converted-image');
    });

    // Content Type with charset parameter
    test('handles content types with charset parameter', async () => {
      const text = Buffer.from('Hello World', 'utf8');
      const result = await convertData(text, 'text/plain; charset=utf-8', 'txt');
      expect(result).toBe(text);
    });

    // Error handling
    test('throws error when JSON conversion fails', async () => {
      const invalidJson = Buffer.from('{"name": unclosed quote}', 'utf8');
      await expect(convertData(invalidJson, 'application/json', 'yaml')).rejects.toThrow();
    });
  });
});
