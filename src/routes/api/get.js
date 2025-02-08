// src/routes/api/get.js
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    const ownerId = req.user;
    const expand = req.query.expand;

    logger.debug('Retrieving fragments', {
      ownerId,
      expand,
    });

    // Get all fragments for this user
    const fragments = await Fragment.byUser(ownerId, expand === '1');

    // Log the exact structure of fragments
    logger.debug('Fragments retrieved', {
      fragmentsType: typeof fragments,
      fragmentsLength: fragments.length,
      fragmentsFirstItem: fragments[0],
      fragmentsDetails: JSON.stringify(fragments),
    });

    res.status(200).json(
      createSuccessResponse({
        fragments: expand === '1' ? fragments : fragments.map((fragment) => fragment.id),
      })
    );
  } catch (error) {
    logger.error({ error }, 'Error getting fragments');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
