// src/routes/api/post.js

const { Fragment } = require('../../model/fragment');
require('dotenv').config();

const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

// For setting the header, choosing the appropriate header
const getApiUrl = (req) => {
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  return `http://${req.headers.host}`;
};

module.exports = async (req, res) => {
  try {
    // Check if we got a Buffer or not
    if (!Buffer.isBuffer(req.body)) {
      logger.warn('Request body is not a Buffer');
      return res.status(415).json(createErrorResponse(415, 'Unsupported Media Type'));
    }

    // Get the content type header
    const contentType = req.get('Content-Type');

    // Validate the content type
    if (!Fragment.isSupportedType(contentType)) {
      logger.warn(`Unsupported type: ${contentType}`);
      return res.status(415).json(createErrorResponse(415, 'Unsupported Media Type'));
    }

    // Create the fragment
    const fragment = new Fragment({
      ownerId: req.user,
      type: contentType,
      size: req.body.length,
    });

    // Save the fragment metadata and data
    await fragment.save();
    await fragment.setData(req.body);

    // Generate the full URL for the Location header using the request's host
    const apiUrl = getApiUrl(req);
    const locationUrl = `${apiUrl}/v1/fragments/${fragment.id}`;

    // Create fragment response object with all required properties
    const fragmentResponse = {
      id: fragment.id,
      ownerId: fragment.ownerId,
      created: fragment.created,
      updated: fragment.updated,
      type: fragment.type,
      size: fragment.size,
    };

    // Set response headers
    res.set('Location', locationUrl);
    res.set('Content-Type', contentType);

    // Send the response with proper structure
    res.status(201).json(
      createSuccessResponse({
        status: 'ok',
        data: {
          fragment: fragmentResponse,
        },
      })
    );

    logger.info({ fragment: fragment }, 'Fragment successfully created');
  } catch (error) {
    logger.error({ error }, 'Error creating fragment');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
