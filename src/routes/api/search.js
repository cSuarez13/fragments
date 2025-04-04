// src/routes/api/search.js
// Implements a search endpoint for fragments

const { Fragment } = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

/**
 * Search for fragments based on metadata criteria
 */
module.exports = async (req, res) => {
  try {
    const ownerId = req.user;

    // Parse query parameters for search criteria
    const {
      type,
      before, // created before this ISO date
      after, // created after this ISO date
      modified, // modified after this ISO date
      minSize, // minimum size in bytes
      maxSize, // maximum size in bytes
      expanded, // boolean flag for expanded results (similar to ?expand=1)
    } = req.query;

    logger.debug('Searching fragments with criteria', {
      ownerId,
      type,
      before,
      after,
      modified,
      minSize,
      maxSize,
    });

    // Get all fragments for this user (expanded to include metadata)
    const allFragments = await Fragment.byUser(ownerId, true);

    if (!allFragments || allFragments.length === 0) {
      return res.status(200).json(createSuccessResponse({ fragments: [] }));
    }

    // Apply filters to the fragments
    let filteredFragments = allFragments;

    // Filter by type (can be partial match, e.g., 'text/' will match 'text/plain', 'text/html', etc.)
    if (type) {
      filteredFragments = filteredFragments.filter((fragment) => fragment.type.includes(type));
    }

    // Filter by creation date - before
    if (before) {
      const beforeDate = new Date(before);
      if (isNaN(beforeDate)) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Invalid date format for "before" parameter'));
      }
      filteredFragments = filteredFragments.filter(
        (fragment) => new Date(fragment.created) < beforeDate
      );
    }

    // Filter by creation date - after
    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate)) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Invalid date format for "after" parameter'));
      }
      filteredFragments = filteredFragments.filter(
        (fragment) => new Date(fragment.created) > afterDate
      );
    }

    // Filter by modified date
    if (modified) {
      const modifiedDate = new Date(modified);
      if (isNaN(modifiedDate)) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Invalid date format for "modified" parameter'));
      }
      filteredFragments = filteredFragments.filter(
        (fragment) => new Date(fragment.updated) > modifiedDate
      );
    }

    // Filter by minimum size
    if (minSize !== undefined) {
      const minSizeNum = parseInt(minSize, 10);
      if (isNaN(minSizeNum)) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Invalid value for "minSize" parameter'));
      }
      filteredFragments = filteredFragments.filter((fragment) => fragment.size >= minSizeNum);
    }

    // Filter by maximum size
    if (maxSize !== undefined) {
      const maxSizeNum = parseInt(maxSize, 10);
      if (isNaN(maxSizeNum)) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Invalid value for "maxSize" parameter'));
      }
      filteredFragments = filteredFragments.filter((fragment) => fragment.size <= maxSizeNum);
    }

    // Check for expanded results request
    const shouldExpand = expanded === '1' || expanded === 'true';

    // Format the response
    const result = shouldExpand
      ? filteredFragments
      : filteredFragments.map((fragment) => fragment.id);

    logger.info('Search results found', {
      count: filteredFragments.length,
      criteria: { type, before, after, modified, minSize, maxSize, expanded },
    });

    // Return the results
    res.status(200).json(
      createSuccessResponse({
        fragments: result,
      })
    );
  } catch (error) {
    logger.error({ error }, 'Error searching fragments');
    res.status(500).json(createErrorResponse(500, error.message));
  }
};
