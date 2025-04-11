// src/routes/api/getById.js
const path = require('path');
const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');
const { convertData, getMimeType } = require('../../utils/converter');

module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    // Get the fragment id from the URL (including any extension)
    let { id } = req.params;

    logger.debug('Getting fragment by ID', { id, ownerId });

    // Check if there's an extension
    const extension = path.extname(id);
    // Remove the extension (if any) from the id
    const fragmentId = extension ? id.replace(extension, '') : id;
    // Get the extension without the dot
    const targetFormat = extension ? extension.slice(1).toLowerCase() : null;

    // Try to get the fragment from the database
    const fragment = await Fragment.byId(ownerId, fragmentId);

    if (!fragment) {
      logger.warn('Fragment not found', { id: fragmentId, ownerId });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Get the raw fragment data
    const data = await fragment.getData();

    // If there's no extension, send the original format
    if (!targetFormat) {
      logger.debug('Sending fragment in original format', { id: fragmentId, type: fragment.type });
      res.setHeader('Content-Type', fragment.type);
      return res.send(data);
    }

    // Special case for text/plain to txt conversion
    if (fragment.type.startsWith('text/plain') && targetFormat === 'txt') {
      logger.debug('Special case: text/plain to txt conversion', {
        id: fragmentId,
        sourceType: fragment.type,
        targetFormat,
      });
      // Just send the plain text data with text/plain content type
      res.setHeader('Content-Type', 'text/plain');
      return res.send(data);
    }

    const formats = fragment.formats || [];

    // Special case for application/json to yaml/yml conversion
    if (
      fragment.type.startsWith('application/json') &&
      (targetFormat === 'yaml' || targetFormat === 'yml')
    ) {
      logger.debug('Special case: JSON to YAML conversion', {
        id: fragmentId,
        sourceType: fragment.type,
        targetFormat,
      });

      try {
        // Convert the data using our converter
        const convertedData = await convertData(data, fragment.type, targetFormat);
        const contentType = getMimeType(targetFormat);
        res.setHeader('Content-Type', contentType);
        return res.send(convertedData);
      } catch (conversionError) {
        logger.error({ error: conversionError }, 'Error converting JSON to YAML');
        return res
          .status(500)
          .json(createErrorResponse(500, `Error converting fragment: ${conversionError.message}`));
      }
    }

    // Normal check for supported formats
    if (!formats.includes(targetFormat)) {
      logger.warn('Conversion not supported', {
        id: fragmentId,
        sourceType: fragment.type,
        targetFormat,
        supportedFormats: formats,
      });
      return res
        .status(415)
        .json(createErrorResponse(415, `Cannot convert fragment to ${targetFormat}`));
    }

    // Convert the data to the requested format
    logger.debug('Converting fragment', {
      id: fragmentId,
      sourceType: fragment.type,
      targetFormat,
    });

    // Special case for tests and backward compatibility
    if (fragment.type === 'text/markdown' && targetFormat === 'html') {
      const markdown = require('markdown-it')();
      const htmlContent = markdown.render(data.toString());
      res.setHeader('Content-Type', 'text/html');
      return res.send(htmlContent);
    }

    try {
      // Convert the data using our new converter
      const convertedData = await convertData(data, fragment.type, targetFormat);

      // Get the appropriate MIME type for the converted format
      const contentType = getMimeType(targetFormat);

      // Send the converted data
      res.setHeader('Content-Type', contentType);
      return res.send(convertedData);
    } catch (conversionError) {
      logger.error({ error: conversionError }, 'Error converting fragment');
      return res
        .status(500)
        .json(createErrorResponse(500, `Error converting fragment: ${conversionError.message}`));
    }
  } catch (error) {
    logger.error({ error }, 'Error getting fragment by id');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
