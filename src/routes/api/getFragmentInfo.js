// src/routes/api/getFragmentInfo.js
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    const id = req.params.id;

    logger.debug('Getting fragment metadata', { id });

    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn('Fragment not found', { id });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Return only the metadata in a JSON response
    res.json(
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
    logger.error({ error }, 'Error getting fragment metadata');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
