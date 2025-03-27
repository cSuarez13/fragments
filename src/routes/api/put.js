// src/routes/api/put.js

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Update an existing fragment's data
 */
module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    const { id } = req.params;
    const contentType = req.get('Content-Type');

    logger.debug(`Updating fragment with id=${id} for user=${ownerId}`);

    // Check if fragment exists
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn(`Fragment with id=${id} not found for user=${ownerId}`);
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Check if content type matches
    if (fragment.type !== contentType) {
      logger.warn(`Content type mismatch: expected ${fragment.type}, got ${contentType}`);
      return res
        .status(400)
        .json(createErrorResponse(400, 'Content-Type cannot be changed after fragment is created'));
    }

    // Update the fragment data
    await fragment.setData(req.body);
    logger.info(`Fragment with id=${id} updated for user=${ownerId}`);

    // Return the updated fragment
    res.status(200).json(
      createSuccessResponse({
        fragment: {
          id: fragment.id,
          ownerId: fragment.ownerId,
          created: fragment.created,
          updated: fragment.updated,
          type: fragment.type,
          size: fragment.size,
        },
      })
    );
  } catch (error) {
    logger.error({ error }, 'Error updating fragment');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
