// Fragment class implementation
const { randomUUID } = require('crypto');
const contentType = require('content-type');
const logger = require('../../src/logger');

const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    logger.debug('Creating new Fragment instance', { id, ownerId, type, size });

    if (!ownerId) {
      logger.warn('Attempt to create Fragment without ownerId');
      throw new Error('ownerId is required');
    }
    if (!type) {
      logger.warn('Attempt to create Fragment without type');
      throw new Error('type is required');
    }
    if (typeof size !== 'number') {
      logger.warn('Invalid size type provided', { size, type: typeof size });
      throw new Error('size must be a number');
    }
    if (size < 0) {
      logger.warn('Negative size provided', { size });
      throw new Error('size cannot be negative');
    }
    if (!Fragment.isSupportedType(type)) {
      logger.warn('Invalid type provided', { type });
      throw new Error('invalid type');
    }

    this.id = id || randomUUID();
    this.ownerId = ownerId;
    this.created = created || new Date().toISOString();
    this.updated = updated || this.created;
    this.type = type;
    this.size = size;

    logger.debug('Fragment instance created successfully', { id: this.id });
  }

  static async byUser(ownerId, expand = false) {
    logger.debug('Getting fragments by user', { ownerId, expand });

    if (!ownerId) {
      logger.error('byUser called without ownerId');
      throw new Error('ownerId is required');
    }

    const fragments = await listFragments(ownerId, expand);

    if (expand) {
      logger.debug('Expanding fragment data', { count: fragments.length });
      // Make sure each fragment has the ownerId before creating Fragment instances
      return fragments.map((fragmentData) => {
        // If ownerId is missing, add it from the function parameter
        if (!fragmentData.ownerId) {
          fragmentData.ownerId = ownerId;
        }
        return new Fragment(fragmentData);
      });
    }

    logger.debug('Returning fragment ids', { count: fragments.length });
    return fragments;
  }
  static async byId(ownerId, id) {
    logger.debug('Getting fragment by id', { ownerId, id });
    try {
      const fragmentData = await readFragment(ownerId, id);
      return new Fragment(fragmentData);
    } catch (error) {
      logger.error('Error reading fragment', { ownerId, id, error: error.message });
      return null;
    }
  }

  static async delete(ownerId, id) {
    logger.debug('Deleting fragment', { ownerId, id });
    try {
      await deleteFragment(ownerId, id);
      logger.info('Fragment deleted successfully', { ownerId, id });
    } catch (error) {
      logger.error('Error deleting fragment', { ownerId, id, error: error.message });
      throw error;
    }
  }

  async save() {
    logger.debug('Saving fragment metadata', { id: this.id });
    this.updated = new Date().toISOString();
    try {
      await writeFragment(this);
      logger.info('Fragment metadata saved successfully', { id: this.id });
    } catch (error) {
      logger.error('Error saving fragment metadata', { id: this.id, error: error.message });
      throw error;
    }
  }

  async getData() {
    logger.debug('Getting fragment data', { id: this.id });
    try {
      const data = await readFragmentData(this.ownerId, this.id);
      logger.debug('Fragment data retrieved', { id: this.id, size: data.length });
      return data;
    } catch (error) {
      logger.error('Error reading fragment data', { id: this.id, error: error.message });
      throw error;
    }
  }

  async setData(data) {
    logger.debug('Setting fragment data', { id: this.id, size: data.length });
    try {
      await writeFragmentData(this.ownerId, this.id, data);
      this.size = data.length;
      this.updated = new Date().toISOString();
      await this.save();
      logger.info('Fragment data saved successfully', { id: this.id, size: this.size });
    } catch (error) {
      logger.error('Error setting fragment data', { id: this.id, error: error.message });
      throw error;
    }
  }

  get mimeType() {
    const { type } = contentType.parse(this.type);
    logger.debug('Getting mime type', { type: this.type, mimeType: type });
    return type;
  }

  get isText() {
    const isTextType = this.mimeType.startsWith('text/');
    logger.debug('Checking if fragment is text', { type: this.type, isText: isTextType });
    return isTextType;
  }

  get formats() {
    logger.debug('Getting supported formats', { type: this.type });

    // Base MIME type (without parameters like charset)
    const baseMimeType = this.mimeType.split(';')[0].trim();

    // Handle text formats
    if (baseMimeType === 'text/plain') {
      return ['text/plain'];
    }

    if (baseMimeType === 'text/markdown') {
      return ['md', 'html', 'txt'];
    }

    if (baseMimeType === 'text/html') {
      return ['html', 'txt'];
    }

    if (baseMimeType === 'text/csv') {
      return ['csv', 'txt', 'json'];
    }

    // Handle data formats
    if (baseMimeType === 'application/json') {
      return ['json', 'txt'];
    }

    if (baseMimeType === 'application/yaml' || baseMimeType === 'application/yml') {
      return ['yaml', 'yml', 'json', 'txt'];
    }

    // Handle image formats - all image types can be converted to any other image type
    if (baseMimeType.startsWith('image/')) {
      return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'];
    }

    // Default to returning just the extension from the MIME type
    const ext = baseMimeType.split('/')[1];
    return ext ? [ext] : [];
  }

  // Add a helper method to determine if a fragment can be converted to a target type
  canConvert(extension) {
    // Plain text can only be returned as text/plain
    if (this.type.startsWith('text/plain')) {
      return extension === 'text/plain' || extension === 'txt';
    }

    // Markdown can be converted to HTML or txt
    if (this.type === 'text/markdown') {
      return ['md', 'html', 'txt'].includes(extension);
    }

    // HTML can be converted to HTML or txt
    if (this.type === 'text/html') {
      return ['html', 'txt'].includes(extension);
    }

    // Handle image conversions - all image types can be converted to any other image type
    if (this.type.startsWith('image/')) {
      return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif'].includes(extension);
    }

    // Default check against the formats
    return this.formats.includes(extension);
  }

  static isSupportedType(value) {
    logger.debug('Checking if type is supported', { type: value });

    try {
      // Parse the content type to handle parameters like charset
      const { type } = contentType.parse(value);

      // The base type (e.g., 'text/plain', 'image/png')
      const baseType = type.split(';')[0].trim();

      // List of supported MIME types
      const supportedTypes = [
        // Text formats
        'text/plain',
        'text/markdown',
        'text/html',
        'text/csv',

        // Data formats
        'application/json',
        'application/yaml',
        'application/yml',

        // Image formats
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/avif',
        'image/gif',
      ];

      const supported = supportedTypes.some(
        (supportedType) =>
          baseType === supportedType ||
          // Special case for text/plain with charset
          (baseType === 'text/plain' && type.startsWith('text/plain;'))
      );

      if (!supported) {
        logger.warn('Unsupported content type', { type: baseType });
      }

      return supported;
    } catch (error) {
      logger.warn('Invalid content type format', { type: value, error: error.message });
      return false;
    }
  }

  /**
   * Creates a new version of the fragment when data is updated
   * @returns {Promise<Object>} The created version object
   */
  async createVersion() {
    const { FragmentVersion } = require('./fragment-version');
    const { writeFragmentVersion, writeFragmentVersionData, getLatestVersionNumber } = process.env
      .AWS_REGION
      ? require('./data/aws/versions')
      : require('./data/memory/versions');

    try {
      // Get the latest version number and increment it
      const lastVersionNum = await getLatestVersionNumber(this.ownerId, this.id);
      const newVersionNum = lastVersionNum + 1;

      // Create a version ID using the pattern fragmentId_v1, fragmentId_v2, etc.
      const versionId = FragmentVersion.toVersionId(this.id, newVersionNum);

      // Create a version object
      const version = new FragmentVersion({
        id: versionId,
        fragmentId: this.id,
        ownerId: this.ownerId,
        created: new Date().toISOString(),
        type: this.type,
        size: this.size,
        versionNum: newVersionNum,
      });

      // Get current fragment data
      const data = await this.getData();

      // Save version metadata
      await writeFragmentVersion(version);

      // Save version data
      await writeFragmentVersionData(this.ownerId, versionId, data);

      logger.info('Created fragment version', {
        fragmentId: this.id,
        versionId,
        versionNum: newVersionNum,
      });

      return version;
    } catch (error) {
      logger.error('Error creating fragment version', {
        fragmentId: this.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get all versions of this fragment
   * @param {boolean} expand - Whether to include full metadata (true) or just IDs (false)
   * @returns {Promise<Array>} Array of version objects or IDs
   */
  async getVersions(expand = false) {
    const { listFragmentVersions } = process.env.AWS_REGION
      ? require('./data/aws/versions')
      : require('./data/memory/versions');

    try {
      return await listFragmentVersions(this.ownerId, this.id, expand);
    } catch (error) {
      logger.error('Error getting fragment versions', {
        fragmentId: this.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get a specific version of this fragment
   * @param {string} versionId - The version ID to retrieve
   * @returns {Promise<Object|null>} The version object and data, or null if not found
   */
  async getVersion(versionId) {
    const { readFragmentVersion, readFragmentVersionData } = process.env.AWS_REGION
      ? require('./data/aws/versions')
      : require('./data/memory/versions');
    const { FragmentVersion } = require('./fragment-version');

    try {
      // First, validate that this versionId belongs to this fragment
      try {
        const { fragmentId } = FragmentVersion.parseVersionId(versionId);
        if (fragmentId !== this.id) {
          throw new Error('Version does not belong to this fragment');
        }
      } catch (parseError) {
        logger.warn('Invalid version ID format', { versionId, error: parseError.message });
        return null;
      }

      // Get the version metadata
      const version = await readFragmentVersion(this.ownerId, versionId);
      if (!version) {
        return null;
      }

      // Get the version data
      const data = await readFragmentVersionData(this.ownerId, versionId);

      return { metadata: version, data };
    } catch (error) {
      logger.error('Error getting fragment version', {
        fragmentId: this.id,
        versionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Restore the fragment to a specific version
   * @param {string} versionId - The version ID to restore
   * @returns {Promise<boolean>} Whether the restore was successful
   */
  async restoreVersion(versionId) {
    // Determine which data layer to use based on environment
    const versionHandler = process.env.AWS_REGION
      ? require('./data/aws/versions')
      : require('./data/memory/versions');

    const { readFragmentVersionData } = versionHandler;
    const { FragmentVersion } = require('./fragment-version');

    try {
      // First, validate that this versionId belongs to this fragment
      let fragmentId;
      try {
        const result = FragmentVersion.parseVersionId(versionId);
        fragmentId = result.fragmentId;

        if (fragmentId !== this.id) {
          throw new Error('Version does not belong to this fragment');
        }
      } catch (parseError) {
        logger.warn('Invalid version ID format', { versionId, error: parseError.message });
        throw new Error(`Invalid version ID format: ${parseError.message}`);
      }

      // Get the version data
      const versionData = await readFragmentVersionData(this.ownerId, versionId);
      if (!versionData) {
        logger.warn('Version data not found', { versionId });
        throw new Error('Version data not found');
      }

      // Update the fragment with this version's data
      await this.setData(versionData);

      logger.info('Restored fragment to version', {
        fragmentId: this.id,
        versionId,
      });

      return true;
    } catch (error) {
      logger.error('Error restoring fragment version', {
        fragmentId: this.id,
        versionId,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports.Fragment = Fragment;
