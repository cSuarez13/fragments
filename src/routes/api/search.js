// src/routes/api/search.js
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

      // Set time to end of day to make the comparison more intuitive
      beforeDate.setHours(23, 59, 59, 999);

      filteredFragments = filteredFragments.filter(
        (fragment) => new Date(fragment.created) <= beforeDate
      );

      logger.debug('Filtered by before date', {
        beforeDate: beforeDate.toISOString(),
        remaining: filteredFragments.length,
      });
    }

    // Filter by creation date - after
    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate)) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Invalid date format for "after" parameter'));
      }

      // Set time to beginning of day to make the comparison more intuitive
      afterDate.setHours(0, 0, 0, 0);

      filteredFragments = filteredFragments.filter(
        (fragment) => new Date(fragment.created) >= afterDate
      );

      logger.debug('Filtered by after date', {
        afterDate: afterDate.toISOString(),
        remaining: filteredFragments.length,
      });
    }

    // Filter by modified date - handle edge case of fragments not truly modified
    if (modified) {
      const modifiedDate = new Date(modified);
      if (isNaN(modifiedDate)) {
        return res
          .status(400)
          .json(createErrorResponse(400, 'Invalid date format for "modified" parameter'));
      }

      // Set time to beginning of day for more intuitive comparison
      modifiedDate.setHours(0, 0, 0, 0);

      filteredFragments = filteredFragments.filter((fragment) => {
        const createdDate = new Date(fragment.created);
        const updatedDate = new Date(fragment.updated);

        // Check if the fragment has been meaningfully modified
        // Only consider it modified if the difference is more than 2 seconds
        // This helps filter out fragments that have nearly identical timestamps from creation process
        const wasActuallyModified = Math.abs(updatedDate - createdDate) > 2000;

        // Only include fragment if:
        // 1. It was actually modified (timestamps differ by >2s)
        // 2. The modification happened after the specified date
        return wasActuallyModified && updatedDate >= modifiedDate;
      });

      logger.debug('Filtered by modified date', {
        modifiedDate: modifiedDate.toISOString(),
        remaining: filteredFragments.length,
      });
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

      logger.debug('Filtered by min size', {
        minSize: minSizeNum,
        remaining: filteredFragments.length,
      });
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

      logger.debug('Filtered by max size', {
        maxSize: maxSizeNum,
        remaining: filteredFragments.length,
      });
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
