// src/routes/index.js
const express = require('express');
const { version, author } = require('../../package.json');

// Our authentication middleware
const { authenticate } = require('../auth');

// Response utility functions
const { createSuccessResponse } = require('../response');

// Create a router that we can use to mount our API
const router = express.Router();

/**
 * Expose all of our API routes on /v1/* to include an API version.
 * Protect them all with authentication middleware.
 */
router.use('/v1', authenticate(), require('./api'));

/**
 * Define a simple health check route. If the server is running,
 * we'll respond with a 200 OK. If not, the server isn't healthy.
 */
router.get('/', (req, res) => {
  // Clients shouldn't cache this response (always request it fresh)
  res.setHeader('Cache-Control', 'no-cache');

  // Send a 200 'OK' response using createSuccessResponse
  return res.status(200).json(
    createSuccessResponse({
      status: 'ok',
      author,
      githubUrl: 'https://github.com/cSuarez13/fragments', // Ensure this is your actual GitHub URL
      version,
    })
  );
});

module.exports = router;
