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

    if (this.type.startsWith('text/plain')) {
      return ['text/plain'];
    }

    if (this.type === 'text/markdown') {
      return ['md', 'html', 'txt'];
    }

    if (this.type === 'text/html') {
      return ['html', 'txt'];
    }

    if (this.type === 'application/json') {
      return ['json', 'txt'];
    }

    // Default to returning just the mimeType extension
    const ext = this.mimeType.split('/')[1];
    return ext ? [ext] : [];
  }

  static isSupportedType(value) {
    logger.debug('Checking if type is supported', { type: value });
    const supportedTypes = [
      'text/plain',
      'text/plain; charset=utf-8',
      'text/markdown',
      'text/html',
      'text/csv',
      'application/json',
      'application/yaml',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/avif',
      'image/gif',
    ];
    try {
      const { type } = contentType.parse(value);
      const supported = supportedTypes.includes(type);
      if (!supported) {
        logger.warn('Unsupported content type', { type });
      }
      return supported;
    } catch (error) {
      logger.warn('Invalid content type format', { type: value, error: error.message });
      return false;
    }
  }
}

module.exports.Fragment = Fragment;
