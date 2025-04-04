// src/routes/api/restoreVersion.js
// This route handles POST /v1/fragments/:id/versions requests

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    const { id } = req.params;
    const { versionId } = req.body || {};

    // Log request details for debugging
    logger.debug('Restore version request:', {
      params: req.params,
      body: req.body,
      contentType: req.get('Content-Type'),
      hasVersionId: !!versionId,
    });

    // Check if versionId is provided
    if (!versionId) {
      logger.warn('Missing versionId in request body');
      return res.status(400).json(createErrorResponse(400, 'Missing versionId in request body'));
    }

    // Check if fragment exists
    const fragment = await Fragment.byId(ownerId, id);
    if (!fragment) {
      logger.warn('Fragment not found', { id });
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Log fragment found
    logger.debug('Found fragment:', {
      id: fragment.id,
      hasRestoreMethod: typeof fragment.restoreVersion === 'function',
    });

    // Restore the fragment to the specified version
    try {
      await fragment.restoreVersion(versionId);
    } catch (restoreError) {
      logger.error({ error: restoreError }, 'Error restoring fragment version');

      // Handle specific errors with appropriate status codes
      if (
        restoreError.message &&
        (restoreError.message.includes('Version does not belong to this fragment') ||
          restoreError.message.includes('Invalid version ID format'))
      ) {
        return res.status(400).json(createErrorResponse(400, restoreError.message));
      }

      if (restoreError.message && restoreError.message.includes('Version data not found')) {
        return res.status(404).json(createErrorResponse(404, 'Version not found'));
      }

      // Generic server error for other issues
      return res
        .status(500)
        .json(
          createErrorResponse(500, `Error restoring fragment version: ${restoreError.message}`)
        );
    }

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
    logger.error({ error }, 'Error processing restore version request');
    res.status(500).json(createErrorResponse(500, `Server error: ${error.message}`));
  }
};
