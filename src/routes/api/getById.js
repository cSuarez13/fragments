// src/routes/api/getById.js
const path = require('path');
const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');
// Import markdown-it
const markdown = require('markdown-it')();

module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    // Get the fragment id from the URL
    let { id } = req.params;

    // Check if there's an extension
    const extension = path.extname(id);
    // Remove the extension (if any) from the id
    id = extension ? id.replace(extension, '') : id;

    const fragment = await Fragment.byId(ownerId, id);

    if (!fragment) {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Get the raw fragment data
    const data = await fragment.getData();

    // If there's no extension, send the original format
    if (!extension) {
      res.setHeader('Content-Type', fragment.type);
      return res.send(data);
    }

    // Handle conversions based on extension
    const targetType = extension.slice(1);
    if (!fragment.formats.includes(targetType)) {
      return res
        .status(415)
        .json(createErrorResponse(415, `Cannot convert fragment to ${targetType}`));
    }

    // Set appropriate Content-Type
    let contentType;
    switch (targetType) {
      case 'html':
        contentType = 'text/html';
        break;
      case 'txt':
        contentType = 'text/plain';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'md':
        contentType = 'text/markdown';
        break;
      default:
        contentType = fragment.type;
    }

    // Handle Markdown to HTML conversion
    if (fragment.type === 'text/markdown' && targetType === 'html') {
      const htmlContent = markdown.render(data.toString());
      res.setHeader('Content-Type', contentType);
      return res.send(htmlContent);
    }

    // For other conversions, return original data with new Content-Type
    res.setHeader('Content-Type', contentType);
    res.send(data);
  } catch (error) {
    logger.error({ error }, 'Error getting fragment by id');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
