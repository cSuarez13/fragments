// src/routes/api/get.js

const { createSuccessResponse } = require('../../response');

/**
 * Get a list of fragments for the current user
 */
module.exports = (req, res) => {
  console.log('Authenticated User:', req.user); // Debug log

  // TODO: Replace this placeholder with the actual logic to retrieve fragments for the user
  const fragments = []; // Placeholder

  // Use createSuccessResponse to structure the response
  res.status(200).json(createSuccessResponse({ fragments }));
};
