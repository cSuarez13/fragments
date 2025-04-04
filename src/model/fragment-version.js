// src/model/fragment-version.js
const logger = require('../logger');

/**
 * Fragment Version class to represent a specific version of a fragment
 */
class FragmentVersion {
  constructor({ id, fragmentId, ownerId, created, updated, type, size = 0, versionNum }) {
    logger.debug('Creating new FragmentVersion instance', { id, fragmentId, ownerId, versionNum });

    if (!fragmentId) {
      logger.warn('Attempt to create FragmentVersion without fragmentId');
      throw new Error('fragmentId is required');
    }
    if (!ownerId) {
      logger.warn('Attempt to create FragmentVersion without ownerId');
      throw new Error('ownerId is required');
    }
    if (!type) {
      logger.warn('Attempt to create FragmentVersion without type');
      throw new Error('type is required');
    }
    if (typeof size !== 'number') {
      logger.warn('Invalid size type provided', { size, type: typeof size });
      throw new Error('size must be a number');
    }
    if (!versionNum || typeof versionNum !== 'number') {
      logger.warn('Invalid versionNum provided', { versionNum, type: typeof versionNum });
      throw new Error('versionNum must be a number');
    }

    this.id = id || FragmentVersion.toVersionId(fragmentId, versionNum);
    this.fragmentId = fragmentId;
    this.ownerId = ownerId;
    this.created = created || new Date().toISOString();
    this.updated = updated || this.created;
    this.type = type;
    this.size = size;
    this.versionNum = versionNum;

    logger.debug('FragmentVersion instance created successfully', { id: this.id, versionNum });
  }

  /**
   * Generate a version ID from a fragment ID and version number
   * @param {string} fragmentId - The fragment ID
   * @param {number} versionNum - The version number
   * @returns {string} - The version ID in the format fragmentId_v1
   */
  static toVersionId(fragmentId, versionNum) {
    return `${fragmentId}_v${versionNum}`;
  }

  /**
   * Parse a version ID to extract the fragment ID and version number
   * @param {string} versionId - The version ID to parse
   * @returns {Object} - Object with fragmentId and versionNum properties
   */
  static parseVersionId(versionId) {
    const parts = versionId.split('_v');
    if (parts.length !== 2) {
      throw new Error(`Invalid version ID format: ${versionId}`);
    }

    const fragmentId = parts[0];
    const versionNum = parseInt(parts[1], 10);

    if (isNaN(versionNum)) {
      throw new Error(`Invalid version number in version ID: ${versionId}`);
    }

    return {
      fragmentId,
      versionNum,
    };
  }
}

module.exports.FragmentVersion = FragmentVersion;
