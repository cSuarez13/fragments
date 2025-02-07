// src/routes/api/get.js
const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    // Get the authenticated user's ID
    const ownerId = req.user;
    // Check if we should expand the fragments or not
    const expand = req.query.expand;

    // Get all fragments for this user
    const fragments = await Fragment.byUser(ownerId, expand === '1');

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
