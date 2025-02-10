// src/routes/api/getById.js
const path = require('path');
const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');

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

    res.setHeader('Content-Type', fragment.type);
    res.send(data);
  } catch (error) {
    logger.error({ error }, 'Error getting fragment by id');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
