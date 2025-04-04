// src/utils/converter.js
const markdown = require('markdown-it')();
const logger = require('../logger');

/**
 * Convert fragment data from one format to another
 * @param {Buffer} data - The original fragment data
 * @param {string} sourceType - The MIME type of the source fragment
 * @param {string} targetExt - The file extension for the target format
 * @returns {Promise<Buffer>} - The converted data as a Buffer
 */
async function convertData(data, sourceType, targetExt) {
  logger.debug('Converting data', { sourceType, targetExt });

  // Get base source type without parameters (e.g., 'text/plain' from 'text/plain; charset=utf-8')
  const baseSourceType = sourceType.split(';')[0].trim();

  try {
    // Handle text/markdown conversions
    if (baseSourceType === 'text/markdown') {
      return convertMarkdown(data, targetExt);
    }

    // Handle text/html conversions
    if (baseSourceType === 'text/html') {
      return convertHtml(data, targetExt);
    }

    // Handle text/csv conversions
    if (baseSourceType === 'text/csv') {
      return convertCsv(data, targetExt);
    }

    // Handle application/json conversions
    if (baseSourceType === 'application/json') {
      return convertJson(data, targetExt);
    }

    // Default: return original data if no conversion needed
    return data;
  } catch (error) {
    logger.error({ error }, 'Error converting data');
    throw new Error(`Conversion error: ${error.message}`);
  }
}

/**
 * Convert markdown data to other formats
 */
function convertMarkdown(data, targetExt) {
  const text = data.toString('utf8');

  switch (targetExt) {
    case 'html': {
      // Convert markdown to HTML using markdown-it
      return Buffer.from(markdown.render(text), 'utf8');
    }
    case 'txt': {
      // Plain text conversion (strip markdown)
      return Buffer.from(text, 'utf8');
    }
    default:
      // Return original markdown
      return data;
  }
}

/**
 * Convert HTML data to other formats
 */
function convertHtml(data, targetExt) {
  const html = data.toString('utf8');

  switch (targetExt) {
    case 'txt': {
      // Simple HTML to text (strip tags)
      const text = html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return Buffer.from(text, 'utf8');
    }
    default:
      // Return original HTML
      return data;
  }
}

/**
 * Convert CSV data to other formats
 */
function convertCsv(data, targetExt) {
  const csv = data.toString('utf8');

  switch (targetExt) {
    case 'json': {
      // Simple CSV to JSON conversion (basic implementation)
      try {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map((header) => header.trim());

        const result = lines.slice(1).map((line) => {
          const values = line.split(',').map((value) => value.trim());
          const obj = {};

          headers.forEach((header, index) => {
            obj[header] = values[index];
          });

          return obj;
        });

        return Buffer.from(JSON.stringify(result), 'utf8');
      } catch (err) {
        logger.error({ err }, 'Error converting CSV to JSON');
        throw new Error('Unable to convert CSV to JSON');
      }
    }
    case 'txt': {
      // Return as plain text
      return data;
    }
    default:
      // Return original CSV
      return data;
  }
}

/**
 * Convert JSON data to other formats
 */
function convertJson(data, targetExt) {
  try {
    const jsonStr = data.toString('utf8');
    const json = JSON.parse(jsonStr);

    switch (targetExt) {
      case 'txt': {
        // JSON to text (prettified JSON)
        return Buffer.from(JSON.stringify(json, null, 2), 'utf8');
      }
      default:
        // Return original JSON
        return data;
    }
  } catch (err) {
    logger.error({ err }, 'Error converting JSON');
    throw new Error('Unable to convert JSON data');
  }
}

/**
 * Get the MIME type for an extension
 * @param {string} extension - The file extension (without dot)
 * @returns {string} - The corresponding MIME type
 */
function getMimeType(extension) {
  const mimeTypes = {
    // Text formats
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    csv: 'text/csv',

    // Data formats
    json: 'application/json',
    yaml: 'application/yaml',
    yml: 'application/yaml',

    // Image formats
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
  };

  return mimeTypes[extension] || 'application/octet-stream';
}

module.exports = {
  convertData,
  getMimeType,
};
