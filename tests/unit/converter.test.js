// tests/unit/converter.test.js
const { convertData, getMimeType } = require('../../src/utils/converter');

// Mock required modules
jest.mock('../../src/logger');

jest.mock('markdown-it', () => {
  return jest.fn().mockImplementation(() => ({
    render: jest.fn((text) => `<h1>${text}</h1>`),
  }));
});

jest.mock('sharp', () => {
  return jest.fn().mockReturnValue({
    png: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    jpg: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    gif: jest.fn().mockReturnThis(),
    avif: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('converted-image')),
  });
});

jest.mock('js-yaml', () => ({
  dump: jest.fn((obj) => {
    if (typeof obj === 'object') {
      return Object.entries(obj)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }
    return String(obj);
  }),
  load: jest.fn((str) => {
    const result = {};
    str.split('\n').forEach((line) => {
      const [key, value] = line.split(':').map((part) => part?.trim());
      if (key && value) {
        result[key] = value;
      }
    });
    return result;
  }),
}));

describe('Converter Utils - Extended Tests', () => {
  describe('convertData() additional tests', () => {
    // Test error handling for JSON parsing
    test('throws error when parsing invalid JSON', async () => {
      const invalidJson = Buffer.from('{"name": "Test", value: 123}'); // Missing quotes around 'value'

      await expect(convertData(invalidJson, 'application/json', 'yaml')).rejects.toThrow();
    });

    // Test edge cases for YAML conversion
    test('handles empty YAML conversion', async () => {
      const emptyYaml = Buffer.from('');
      const result = await convertData(emptyYaml, 'application/yaml', 'json');

      expect(result).toBeInstanceOf(Buffer);
      expect(JSON.parse(result.toString())).toEqual({});
    });

    // Test HTML to text conversion
    test('converts HTML to plain text by stripping tags', async () => {
      const html = Buffer.from('<h1>Title</h1><p>Some <strong>important</strong> content.</p>');
      const text = await convertData(html, 'text/html', 'txt');

      expect(text.toString()).not.toContain('<h1>');
      expect(text.toString()).toContain('Title');
      expect(text.toString()).toContain('Some');
      expect(text.toString()).toContain('important');
      expect(text.toString()).toContain('content');
    });

    // Test CSV to JSON conversion
    test('converts CSV to JSON with proper headers', async () => {
      const csv = Buffer.from('name,age,location\nJohn,30,New York\nJane,25,San Francisco');
      const json = await convertData(csv, 'text/csv', 'json');

      const parsed = JSON.parse(json.toString());
      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({ name: 'John', age: '30', location: 'New York' });
      expect(parsed[1]).toEqual({ name: 'Jane', age: '25', location: 'San Francisco' });
    });

    // Test error handling in CSV conversion
    test('handles malformed CSV without throwing errors', async () => {
      const invalidCsv = Buffer.from('name,age\nJohn,30,extra\nJane');

      const result = await convertData(invalidCsv, 'text/csv', 'json');
      expect(result).toBeInstanceOf(Buffer);
      const parsed = JSON.parse(result.toString());
      expect(Array.isArray(parsed)).toBe(true);
    });

    // Test image format conversions
    test('converts between different image formats correctly', async () => {
      const sharp = require('sharp');
      const pngBuffer = Buffer.from('fake-png-data');

      // Test PNG to JPEG conversion
      await convertData(pngBuffer, 'image/png', 'jpg');
      expect(sharp).toHaveBeenCalledWith(pngBuffer);
      expect(sharp().jpeg).toHaveBeenCalled();

      // Test PNG to WEBP conversion
      await convertData(pngBuffer, 'image/png', 'webp');
      expect(sharp).toHaveBeenCalledWith(pngBuffer);
      expect(sharp().webp).toHaveBeenCalled();

      // Test PNG to AVIF conversion
      await convertData(pngBuffer, 'image/png', 'avif');
      expect(sharp).toHaveBeenCalledWith(pngBuffer);
      expect(sharp().avif).toHaveBeenCalled();

      // Test PNG to GIF conversion
      await convertData(pngBuffer, 'image/png', 'gif');
      expect(sharp).toHaveBeenCalledWith(pngBuffer);
      expect(sharp().gif).toHaveBeenCalled();
    });

    // Test error handling for image conversion
    test('handles errors in image conversion', async () => {
      const sharp = require('sharp');
      sharp().toBuffer.mockRejectedValueOnce(new Error('Image conversion error'));

      await expect(convertData(Buffer.from('image-data'), 'image/jpeg', 'png')).rejects.toThrow(
        'Image conversion error'
      );
    });

    // Test handling of content types with parameters
    test('handles content types with parameters', async () => {
      const textWithCharset = Buffer.from('Hello World');
      const result = await convertData(textWithCharset, 'text/plain; charset=utf-8', 'txt');

      expect(result).toEqual(textWithCharset);
    });

    // Test returning original data for same format
    test('returns original data for text/plain to txt conversion', async () => {
      const originalData = Buffer.from('Original content');

      // Text/plain to txt
      const result = await convertData(originalData, 'text/plain', 'txt');
      expect(result).toEqual(originalData);
    });

    test('throws error for invalid YAML conversion', async () => {
      const jsYaml = require('js-yaml');
      jsYaml.load.mockImplementationOnce(() => {
        throw new Error('Invalid YAML');
      });

      await expect(
        convertData(Buffer.from('invalid: yaml: format'), 'application/yaml', 'json')
      ).rejects.toThrow('Unable to convert YAML data');
    });

    // Test for default case when no specific conversion is defined
    test('returns original data for unknown conversion type', async () => {
      const originalData = Buffer.from('Original content');
      const result = await convertData(originalData, 'application/custom', 'custom');
      expect(result).toEqual(originalData);
    });
  });

  describe('getMimeType() additional tests', () => {
    test('returns correct MIME type for known extensions', () => {
      expect(getMimeType('csv')).toBe('text/csv');
      expect(getMimeType('yaml')).toBe('application/yaml');
      expect(getMimeType('yml')).toBe('application/yaml');
      expect(getMimeType('avif')).toBe('image/avif');
      expect(getMimeType('gif')).toBe('image/gif');
    });

    test('returns application/octet-stream for unknown extensions', () => {
      expect(getMimeType('xyz')).toBe('application/octet-stream');
      expect(getMimeType('custom')).toBe('application/octet-stream');
      expect(getMimeType('')).toBe('application/octet-stream');
    });

    test('uses lowercase for extensions', () => {
      expect(getMimeType('jpg')).toBe('image/jpeg');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('json')).toBe('application/json');
    });
  });

  describe('error handling edge cases', () => {
    test('handles image conversion errors', async () => {
      // Set up sharp to throw
      const sharp = require('sharp');
      sharp().toBuffer.mockRejectedValueOnce(new Error('Sharp error'));

      // Test image conversion error
      await expect(convertData(Buffer.from('image-data'), 'image/png', 'jpg')).rejects.toThrow(
        'Sharp error'
      );
    });
  });
});
