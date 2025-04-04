// src/routes/api/getVersions.js
// This route handles GET /v1/fragments/:id/versions requests

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    const id = req.params.id;
    const expand = req.query.expand === '1';

    logger.debug('Getting fragment versions', { id, ownerId, expand });

    // Check if fragment exists
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn('Fragment not found', { id });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Get all versions for this fragment
    const versions = await fragment.getVersions(expand);

    // Return the versions
    res.status(200).json(
      createSuccessResponse({
        versions,
      })
    );
  } catch (error) {
    logger.error({ error }, 'Error getting fragment versions');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
