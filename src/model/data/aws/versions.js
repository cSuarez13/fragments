// src/model/data/aws/versions.js

const { PutCommand, GetCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = require('./s3Client');
const ddbDocClient = require('./ddbDocClient');
const logger = require('../../../logger');

/**
 * Converts a readable stream to a Buffer
 * @param {ReadableStream} stream - The stream to convert
 * @returns {Promise<Buffer>} - A Promise that resolves to a Buffer
 */
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

/**
 * Writes a fragment version's metadata to DynamoDB.
 * @param {Object} version - FragmentVersion instance
 * @returns {Promise}
 */
async function writeFragmentVersion(version) {
  // Configure our PUT params, with the name of the table and item (attributes and keys)
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Item: {
      ...version,
      // Add an attribute to indicate this is a version record
      recordType: 'version',
    },
  };

  // Create a PUT command to send to DynamoDB
  const command = new PutCommand(params);

  try {
    return ddbDocClient.send(command);
  } catch (err) {
    logger.warn({ err, params, version }, 'error writing fragment version to DynamoDB');
    throw err;
  }
}

/**
 * Reads a fragment version's metadata from DynamoDB.
 * @param {string} ownerId - The owner's ID
 * @param {string} versionId - The version ID
 * @returns {Promise<Object|undefined>}
 */
async function readFragmentVersion(ownerId, versionId) {
  // Configure our GET params, with the name of the table and key
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    Key: {
      ownerId,
      id: versionId, // version ID is stored in the id field
    },
  };

  // Create a GET command to send to DynamoDB
  const command = new GetCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);
    // Return the item (version) or undefined if not found
    return data?.Item;
  } catch (err) {
    logger.warn({ err, params }, 'error reading fragment version from DynamoDB');
    throw err;
  }
}

/**
 * Writes a fragment version's data to S3.
 * @param {string} ownerId - The owner's ID
 * @param {string} versionId - The version ID
 * @param {Buffer} data - The version data buffer
 * @returns {Promise}
 */
async function writeFragmentVersionData(ownerId, versionId, data) {
  // Create the PUT API params from our details
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    // Store versions in a versions/ subfolder
    Key: `${ownerId}/versions/${versionId}`,
    Body: data,
  };

  // Create a PUT Object command to send to S3
  const command = new PutObjectCommand(params);

  try {
    // Use our client to send the command
    await s3Client.send(command);
    logger.debug({ ownerId, versionId }, 'Successfully uploaded fragment version data to S3');
  } catch (err) {
    // If anything goes wrong, log enough info that we can debug
    const { Bucket, Key } = params;
    logger.error({ err, Bucket, Key }, 'Error uploading fragment version data to S3');
    throw new Error('unable to upload fragment version data');
  }
}

/**
 * Reads a fragment version's data from S3.
 * @param {string} ownerId - The owner's ID
 * @param {string} versionId - The version ID
 * @returns {Promise<Buffer>}
 */
async function readFragmentVersionData(ownerId, versionId) {
  // Create the GET API params from our details
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    // Versions are stored in a versions/ subfolder
    Key: `${ownerId}/versions/${versionId}`,
  };

  logger.debug(`Reading version data from S3: ${params.Bucket}/${params.Key}`);

  // Create a GET Object command to send to S3
  const command = new GetObjectCommand(params);

  try {
    // Get the object from Amazon S3. It is returned as a ReadableStream.
    const data = await s3Client.send(command);

    // Add additional debug info
    logger.debug(
      {
        contentLength: data.ContentLength,
        contentType: data.ContentType,
        hasBody: !!data.Body,
      },
      'S3 response details'
    );

    // Convert the ReadableStream to a Buffer
    const buffer = await streamToBuffer(data.Body);
    logger.debug(`Successfully read version data from S3, size: ${buffer.length} bytes`);
    return buffer;
  } catch (err) {
    const { Bucket, Key } = params;
    logger.error({ err, Bucket, Key }, 'Error streaming fragment version data from S3');
    throw new Error('unable to read fragment version data');
  }
}

/**
 * Lists all versions for a specific fragment
 * @param {string} ownerId - The owner's ID
 * @param {string} fragmentId - The fragment ID
 * @param {boolean} expand - Whether to include full metadata (true) or just IDs (false)
 * @returns {Promise<Array>}
 */
async function listFragmentVersions(ownerId, fragmentId, expand = false) {
  // We'll use a Query operation to find all versions for this fragment
  const params = {
    TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
    // Use ownerId (partition key) = :ownerId in the key condition
    KeyConditionExpression: 'ownerId = :ownerId',
    // Add a filter to only include version records for this fragmentId
    FilterExpression: 'recordType = :recordType AND fragmentId = :fragmentId',
    // Define values for the expressions
    ExpressionAttributeValues: {
      ':ownerId': ownerId,
      ':recordType': 'version',
      ':fragmentId': fragmentId,
    },
  };

  // If we don't need to expand, only retrieve the id
  if (!expand) {
    params.ProjectionExpression = 'id';
  }

  // Create a QUERY command to send to DynamoDB
  const command = new QueryCommand(params);

  try {
    // Wait for the data to come back from AWS
    const data = await ddbDocClient.send(command);
    logger.debug({ count: data?.Items?.length }, 'Retrieved versions from DynamoDB');

    // If we haven't expanded, remap this array from [{id: "..."}, ...] to ["...", ...]
    if (!expand) {
      return data?.Items?.map((item) => item.id) || [];
    }

    // Otherwise, return the full Items array, sorted by versionNum (descending)
    return (data?.Items || []).sort((a, b) => b.versionNum - a.versionNum);
  } catch (err) {
    logger.error({ err, params }, 'error getting fragment versions from DynamoDB');
    throw err;
  }
}

/**
 * Deletes a fragment version (metadata from DynamoDB and data from S3)
 * @param {string} ownerId - The owner's ID
 * @param {string} versionId - The version ID
 * @returns {Promise}
 */
async function deleteFragmentVersion(ownerId, versionId) {
  try {
    // First, delete metadata from DynamoDB
    const deleteMetadataParams = {
      TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
      Key: { ownerId, id: versionId },
    };

    const deleteCommand = new DeleteCommand(deleteMetadataParams);
    await ddbDocClient.send(deleteCommand);
    logger.debug({ ownerId, versionId }, 'Fragment version metadata deleted from DynamoDB');

    // Second, delete data from S3
    const deleteDataParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `${ownerId}/versions/${versionId}`,
    };

    const s3DeleteCommand = new DeleteObjectCommand(deleteDataParams);
    await s3Client.send(s3DeleteCommand);
    logger.debug({ ownerId, versionId }, 'Fragment version data deleted from S3');
  } catch (err) {
    logger.error({ err, ownerId, versionId }, 'Error deleting fragment version');
    throw err;
  }
}

/**
 * Gets the latest version number for a fragment
 * @param {string} ownerId - The owner's ID
 * @param {string} fragmentId - The fragment ID
 * @returns {Promise<number>} - The latest version number, or 0 if no versions exist
 */
async function getLatestVersionNumber(ownerId, fragmentId) {
  try {
    const versions = await listFragmentVersions(ownerId, fragmentId, true);
    if (versions.length === 0) {
      return 0; // No versions yet
    }

    // Sort versions by versionNum in descending order and take the first
    const latestVersion = versions.sort((a, b) => b.versionNum - a.versionNum)[0];
    return latestVersion.versionNum;
  } catch (error) {
    logger.error({ error, ownerId, fragmentId }, 'Error getting latest version number');
    return 0;
  }
}

module.exports = {
  writeFragmentVersion,
  readFragmentVersion,
  writeFragmentVersionData,
  readFragmentVersionData,
  listFragmentVersions,
  deleteFragmentVersion,
  getLatestVersionNumber,
  streamToBuffer,
};
