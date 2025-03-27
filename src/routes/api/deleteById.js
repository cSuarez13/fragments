// src/routes/api/deleteById.js

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Delete a fragment by ID
 */
module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    const { id } = req.params;

    logger.debug(`Attempting to delete fragment with id=${id} for user=${ownerId}`);

    // Check if fragment exists
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn(`Fragment with id=${id} not found for user=${ownerId}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Delete the fragment data and metadata
    await Fragment.delete(ownerId, id);
    logger.info(`Fragment with id=${id} deleted for user=${ownerId}`);

    // Return a 200 response with success message
    res.status(200).json(createSuccessResponse());
  } catch (error) {
    logger.error({ error }, 'Error deleting fragment');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
