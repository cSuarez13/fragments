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

    // We'll return 404 for any non-existent version
    if (!versionId.startsWith(id + '_v')) {
      logger.warn('Invalid version ID format', { id, versionId });
    }

    // Get the specific version
    try {
      const version = await fragment.getVersion(versionId);
      if (!version) {
        logger.warn('Version not found', { id, versionId });
        return res.status(404).json(createErrorResponse(404, 'Version not found'));
      }

      // Return the version data with the appropriate content type
      res.setHeader('Content-Type', version.metadata.type);
      return res.send(version.data);
    } catch (versionError) {
      logger.error({ error: versionError }, 'Error retrieving fragment version');
      return res.status(500).json(createErrorResponse(500, 'Unable to retrieve fragment version'));
    }
  } catch (error) {
    logger.error({ error }, 'Error processing get version request');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
