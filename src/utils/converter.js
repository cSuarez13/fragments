// src/utils/converter.js
const markdown = require('markdown-it')();
const logger = require('../logger');
const sharp = require('sharp');
const yaml = require('js-yaml');

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

    // Handle application/yaml conversions
    if (baseSourceType === 'application/yaml' || baseSourceType === 'application/yml') {
      return convertYaml(data, targetExt);
    }

    // Handle image conversions
    if (baseSourceType.startsWith('image/')) {
      return convertImage(data, baseSourceType, targetExt);
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
      case 'yaml':
      case 'yml': {
        // Convert JSON to YAML
        const yamlStr = yaml.dump(json);
        return Buffer.from(yamlStr, 'utf8');
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
 * Convert YAML data to other formats
 */
function convertYaml(data, targetExt) {
  try {
    const yamlStr = data.toString('utf8');
    const parsedData = yaml.load(yamlStr);

    switch (targetExt) {
      case 'json': {
        // YAML to JSON
        return Buffer.from(JSON.stringify(parsedData), 'utf8');
      }
      case 'txt': {
        // YAML to text (original YAML)
        return data;
      }
      default:
        // Return original YAML
        return data;
    }
  } catch (err) {
    logger.error({ err }, 'Error converting YAML');
    throw new Error('Unable to convert YAML data');
  }
}

/**
 * Convert image data between formats using Sharp
 * @param {Buffer} data - The image data
 * @param {string} sourceType - The source image MIME type
 * @param {string} targetExt - The target format extension
 * @returns {Promise<Buffer>} - The converted image data
 */
async function convertImage(data, sourceType, targetExt) {
  try {
    // Create a Sharp instance with the input buffer
    const image = sharp(data);

    // Set the options based on target format
    switch (targetExt) {
      case 'png':
        return await image.png().toBuffer();
      case 'jpg':
      case 'jpeg':
        return await image.jpeg().toBuffer();
      case 'webp':
        return await image.webp().toBuffer();
      case 'gif':
        return await image.gif().toBuffer();
      case 'avif':
        return await image.avif().toBuffer();
      default:
        // If no conversion needed, return original
        if (sourceType === `image/${targetExt}`) {
          return data;
        }
        // For any other extension, default to PNG
        return await image.png().toBuffer();
    }
  } catch (err) {
    logger.error({ err }, 'Error converting image');
    throw new Error(`Unable to convert image: ${err.message}`);
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
