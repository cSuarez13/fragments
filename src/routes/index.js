// src/routes/index.js
const express = require('express');
const { version } = require('../../package.json');
const { hostname } = require('os');

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

router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).json(
    createSuccessResponse({
      author: 'Claudia Suarez',
      githubUrl: 'https://github.com/cSuarez13/fragments',
      version,
      // Include the hostname in the response
      hostname: hostname(),
    })
  );
});

module.exports = router;
