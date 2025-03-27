// src/routes/api/index.js

/**
 * The main entry-point for the v1 version of the fragments API.
 */
const express = require('express');
const contentType = require('content-type');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

// Create a router on which to mount our API endpoints
const router = express.Router();

// Support sending various Content-Types on the body up to 5M in size
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      try {
        // Log attempt to parse content type
        logger.debug(`Parsing content type: ${req.get('Content-Type')}`);
        const { type } = contentType.parse(req);
        const supported = Fragment.isSupportedType(type);
        if (!supported) {
          logger.warn(`Unsupported content type: ${type}`);
        } else {
          logger.debug(`Content type ${type} is supported`);
        }
        return supported;
      } catch (err) {
        logger.warn(`Invalid content type header: ${err.message}`);
        return false;
      }
    },
  });

// Define our routes
router.get('/fragments', require('./get'));
router.post('/fragments', rawBody(), require('./post'));
router.get('/fragments/:id', require('./getById'));
router.get('/fragments/:id/info', require('./getFragmentInfo'));
router.delete('/fragments/:id', require('./deleteById'));
router.put('/fragments/:id', rawBody(), require('./put'));

module.exports = router;
