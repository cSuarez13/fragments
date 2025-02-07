// src/routes/api/post.js

const { Fragment } = require('../../model/fragment');
require('dotenv').config();

const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

// For setting the header, choosing the appropriate header
const getApiUrl = (req) => {
  logger.debug('Getting API URL');
  if (process.env.API_URL) {
    logger.debug(`Using configured API_URL: ${process.env.API_URL}`);
    return process.env.API_URL;
  }
  const url = `http://${req.headers.host}`;
  logger.debug(`Using host header for API URL: ${url}`);
  return url;
};

module.exports = async (req, res) => {
  try {
    logger.debug('POST fragment request received', { headers: req.headers });

    // Check if we got a Buffer or not
    if (!Buffer.isBuffer(req.body)) {
      logger.warn('Request body is not a Buffer', { body: typeof req.body });
      return res.status(415).json(createErrorResponse(415, 'Unsupported Media Type'));
    }

    // Get the content type header
    const contentType = req.get('Content-Type');
    logger.debug('Content-Type header received', { contentType });

    // Validate the content type
    if (!Fragment.isSupportedType(contentType)) {
      logger.warn(`Unsupported content type: ${contentType}`);
      return res.status(415).json(createErrorResponse(415, 'Unsupported Media Type'));
    }

    // Log the size of the incoming data
    logger.debug(`Creating fragment with size: ${req.body.length} bytes`);

    // Create the fragment
    const fragment = new Fragment({
      ownerId: req.user,
      type: contentType,
      size: req.body.length,
    });

    // Save the fragment metadata and data
    logger.debug('Saving fragment metadata...', { id: fragment.id });
    await fragment.save();

    logger.debug('Saving fragment data...', { id: fragment.id, size: req.body.length });
    await fragment.setData(req.body);

    // Generate the full URL for the Location header using the request's host
    const apiUrl = getApiUrl(req);
    const locationUrl = `${apiUrl}/v1/fragments/${fragment.id}`;
    logger.debug('Generated Location URL', { locationUrl });

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

    logger.info('Fragment successfully created', {
      id: fragment.id,
      ownerId: fragment.ownerId,
      type: fragment.type,
      size: fragment.size,
    });
  } catch (error) {
    logger.error('Error creating fragment', { error: error.message, stack: error.stack });
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
