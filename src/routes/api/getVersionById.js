// src/routes/api/getVersionById.js
// This route handles GET /v1/fragments/:id/versions/:versionId requests

const { Fragment } = require('../../model/fragment');
const { createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    const { id, versionId } = req.params;

    logger.debug('Getting specific fragment version', { id, versionId, ownerId });

    // Check if fragment exists
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn('Fragment not found', { id });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Get the specific version
    const version = await fragment.getVersion(versionId);
    if (!version) {
      logger.warn('Version not found', { id, versionId });
      return res.status(404).json(createErrorResponse(404, 'Version not found'));
    }

    // Return the version data with the appropriate content type
    res.setHeader('Content-Type', version.metadata.type);
    return res.send(version.data);
  } catch (error) {
    logger.error({ error }, 'Error getting fragment version');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
