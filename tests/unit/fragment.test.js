// tests/unit/.test.js
const { Fragment } = require('../../src/model/fragment');
const { FragmentVersion } = require('../../src/model/fragment-version');

// Mock the data layer
jest.mock('../../src/model/data', () => ({
  readFragment: jest.fn(),
  writeFragment: jest.fn(),
  readFragmentData: jest.fn(),
  writeFragmentData: jest.fn(),
  listFragments: jest.fn(),
  deleteFragment: jest.fn(),
}));

// Mock versions functions
jest.mock('../../src/model/data/memory/versions', () => ({
  writeFragmentVersion: jest.fn(),
  readFragmentVersion: jest.fn(),
  writeFragmentVersionData: jest.fn(),
  readFragmentVersionData: jest.fn(),
  listFragmentVersions: jest.fn(),
  deleteFragmentVersion: jest.fn(),
  getLatestVersionNumber: jest.fn(),
}));

jest.mock('../../src/model/data/aws/versions', () => ({
  writeFragmentVersion: jest.fn(),
  readFragmentVersion: jest.fn(),
  writeFragmentVersionData: jest.fn(),
  readFragmentVersionData: jest.fn(),
  listFragmentVersions: jest.fn(),
  deleteFragmentVersion: jest.fn(),
  getLatestVersionNumber: jest.fn(),
}));

const dataLayer = require('../../src/model/data');
const memoryVersions = require('../../src/model/data/memory/versions');

describe('Fragment class - extended tests', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test helper functions and properties
  describe('mimeType and formats', () => {
    test('mimeType returns the basic mime type without charset for text/html', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/html; charset=utf-8',
        size: 0,
      });
      expect(fragment.mimeType).toEqual('text/html');
    });

    test('formats returns appropriate formats for image/png', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'image/png',
        size: 0,
      });
      expect(fragment.formats).toContain('png');
      expect(fragment.formats).toContain('jpg');
      expect(fragment.formats).toContain('webp');
    });

    test('formats returns appropriate formats for text/html', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/html',
        size: 0,
      });
      expect(fragment.formats).toContain('html');
      expect(fragment.formats).toContain('txt');
    });

    test('formats returns appropriate formats for application/json', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'application/json',
        size: 0,
      });
      expect(fragment.formats).toContain('json');
      expect(fragment.formats).toContain('yaml');
      expect(fragment.formats).toContain('txt');
    });

    test('formats returns appropriate formats for text/csv', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/csv',
        size: 0,
      });
      expect(fragment.formats).toContain('csv');
      expect(fragment.formats).toContain('txt');
      expect(fragment.formats).toContain('json');
    });
  });

  describe('canConvert method', () => {
    test('text/plain can only be converted to txt', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/plain',
        size: 0,
      });
      expect(fragment.canConvert('txt')).toBe(true);
      expect(fragment.canConvert('html')).toBe(false);
    });

    test('text/markdown can be converted to html and txt', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'text/markdown',
        size: 0,
      });
      expect(fragment.canConvert('md')).toBe(true);
      expect(fragment.canConvert('html')).toBe(true);
      expect(fragment.canConvert('txt')).toBe(true);
      expect(fragment.canConvert('png')).toBe(false);
    });

    test('image/png can be converted to other image formats', () => {
      const fragment = new Fragment({
        ownerId: '1234',
        type: 'image/png',
        size: 0,
      });
      expect(fragment.canConvert('png')).toBe(true);
      expect(fragment.canConvert('jpg')).toBe(true);
      expect(fragment.canConvert('webp')).toBe(true);
      expect(fragment.canConvert('gif')).toBe(true);
      expect(fragment.canConvert('txt')).toBe(false);
    });
  });

  // Test versioning functionality
  describe('versioning methods', () => {
    let fragment;

    beforeEach(() => {
      fragment = new Fragment({
        id: 'test-id',
        ownerId: 'owner-123',
        type: 'text/plain',
        size: 10,
      });

      // Mock data for testing
      memoryVersions.getLatestVersionNumber.mockResolvedValue(3);

      // Mock writeFragmentVersion
      memoryVersions.writeFragmentVersion.mockResolvedValue(undefined);

      // Mock writeFragmentData
      dataLayer.readFragmentData.mockResolvedValue(Buffer.from('test data'));

      // Mock version data writes
      memoryVersions.writeFragmentVersionData.mockResolvedValue(undefined);
    });

    test('createVersion creates a new version with incremented version number', async () => {
      await fragment.createVersion();

      // Check if getLatestVersionNumber was called with the correct arguments
      expect(memoryVersions.getLatestVersionNumber).toHaveBeenCalledWith('owner-123', 'test-id');

      // Check if writeFragmentVersion was called with the correct arguments
      expect(memoryVersions.writeFragmentVersion).toHaveBeenCalled();
      const versionArg = memoryVersions.writeFragmentVersion.mock.calls[0][0];
      expect(versionArg).toBeInstanceOf(FragmentVersion);
      expect(versionArg.versionNum).toBe(4); // Incremented from 3
      expect(versionArg.fragmentId).toBe('test-id');
      expect(versionArg.ownerId).toBe('owner-123');

      // Check if fragment data was read
      expect(dataLayer.readFragmentData).toHaveBeenCalledWith('owner-123', 'test-id');

      // Check if version data was written
      expect(memoryVersions.writeFragmentVersionData).toHaveBeenCalledWith(
        'owner-123',
        versionArg.id,
        Buffer.from('test data')
      );
    });

    test('getVersions returns array of version objects when expanded is true', async () => {
      const mockVersions = [
        { id: 'test-id_v1', versionNum: 1 },
        { id: 'test-id_v2', versionNum: 2 },
      ];

      memoryVersions.listFragmentVersions.mockResolvedValue(mockVersions);

      const versions = await fragment.getVersions(true);

      expect(memoryVersions.listFragmentVersions).toHaveBeenCalledWith(
        'owner-123',
        'test-id',
        true
      );
      expect(versions).toEqual(mockVersions);
    });

    test('getVersions returns array of version IDs when expanded is false', async () => {
      const mockVersionIds = ['test-id_v1', 'test-id_v2'];

      memoryVersions.listFragmentVersions.mockResolvedValue(mockVersionIds);

      const versions = await fragment.getVersions(false);

      expect(memoryVersions.listFragmentVersions).toHaveBeenCalledWith(
        'owner-123',
        'test-id',
        false
      );
      expect(versions).toEqual(mockVersionIds);
    });

    test('getVersion returns version metadata and data for valid version', async () => {
      const versionMetadata = {
        id: 'test-id_v2',
        fragmentId: 'test-id',
        ownerId: 'owner-123',
        type: 'text/plain',
        size: 9,
        versionNum: 2,
      };

      const versionData = Buffer.from('version 2');

      memoryVersions.readFragmentVersion.mockResolvedValue(versionMetadata);
      memoryVersions.readFragmentVersionData.mockResolvedValue(versionData);

      const result = await fragment.getVersion('test-id_v2');

      expect(memoryVersions.readFragmentVersion).toHaveBeenCalledWith('owner-123', 'test-id_v2');
      expect(memoryVersions.readFragmentVersionData).toHaveBeenCalledWith(
        'owner-123',
        'test-id_v2'
      );

      expect(result).toEqual({
        metadata: versionMetadata,
        data: versionData,
      });
    });

    test('getVersion returns null when version metadata not found', async () => {
      memoryVersions.readFragmentVersion.mockResolvedValue(null);

      const result = await fragment.getVersion('test-id_v2');

      expect(result).toBeNull();
    });

    test('getVersion returns null if versionId does not exist', async () => {
      memoryVersions.readFragmentVersion.mockResolvedValue(null);
      const result = await fragment.getVersion('other-id_v1');
      expect(result).toBeNull();
    });

    test('getVersion returns null for invalid version ID format', async () => {
      const result = await fragment.getVersion('invalid-version-id');
      expect(result).toBeNull();
    });

    test('restoreVersion updates fragment data from version data', async () => {
      const versionData = Buffer.from('restored data');

      // Setup mocks
      memoryVersions.readFragmentVersionData.mockResolvedValue(versionData);
      dataLayer.writeFragmentData.mockResolvedValue(undefined);

      await fragment.restoreVersion('test-id_v2');

      // Check if version data was read
      expect(memoryVersions.readFragmentVersionData).toHaveBeenCalledWith(
        'owner-123',
        'test-id_v2'
      );

      // Check if fragment was updated with version data
      expect(dataLayer.writeFragmentData).toHaveBeenCalledWith('owner-123', 'test-id', versionData);

      // Check that fragment size was updated
      expect(fragment.size).toBe(versionData.length);
    });

    test('restoreVersion throws error if version data not found', async () => {
      memoryVersions.readFragmentVersionData.mockResolvedValue(null);

      await expect(fragment.restoreVersion('test-id_v2')).rejects.toThrow('Version data not found');
    });

    test('restoreVersion throws error if versionId does not belong to the fragment', async () => {
      await expect(fragment.restoreVersion('other-id_v1')).rejects.toThrow();
    });
  });

  // Test static methods with edge cases
  describe('static methods edge cases', () => {
    test('isSupportedType handles invalid content type format', () => {
      expect(Fragment.isSupportedType('invalid content type')).toBe(false);
    });

    test('byId returns null if readFragment throws an error', async () => {
      dataLayer.readFragment.mockRejectedValue(new Error('Database error'));

      const result = await Fragment.byId('owner-123', 'non-existent-id');

      expect(result).toBeNull();
    });

    test('delete handles deletion of non-existent fragment gracefully', async () => {
      dataLayer.deleteFragment.mockRejectedValue(new Error('Not found'));

      await expect(Fragment.delete('owner-123', 'non-existent-id')).rejects.toThrow('Not found');
    });
  });

  // Test error handling in getVersion for invalid versionId
  test('getVersion returns null for invalid version ID format', async () => {
    const fragment = new Fragment({
      id: 'test-id',
      ownerId: 'owner-123',
      type: 'text/plain',
      size: 10,
    });

    const result = await fragment.getVersion('invalid-version-format');
    expect(result).toBeNull();
  });

  // Test error handling in getVersion when version doesn't belong to fragment
  test('getVersion returns null when version belongs to different fragment', async () => {
    const fragment = new Fragment({
      id: 'test-id',
      ownerId: 'owner-123',
      type: 'text/plain',
      size: 10,
    });

    const result = await fragment.getVersion('other-fragment-id_v1');
    expect(result).toBeNull();
  });

  // Test error handling in getData
  test('getData handles errors gracefully', async () => {
    const dataLayer = require('../../src/model/data');
    dataLayer.readFragmentData.mockRejectedValue(new Error('Data access error'));

    const fragment = new Fragment({
      id: 'test-id',
      ownerId: 'owner-123',
      type: 'text/plain',
      size: 10,
    });

    await expect(fragment.getData()).rejects.toThrow('Data access error');
  });

  // Test error handling in setData
  test('setData handles errors gracefully', async () => {
    const dataLayer = require('../../src/model/data');
    dataLayer.writeFragmentData.mockRejectedValue(new Error('Data write error'));

    const fragment = new Fragment({
      id: 'test-id',
      ownerId: 'owner-123',
      type: 'text/plain',
      size: 10,
    });

    await expect(fragment.setData(Buffer.from('test'))).rejects.toThrow('Data write error');
  });

  // Test edge cases for supported content types
  test('isSupportedType handles various edge cases', () => {
    // Valid types with parameters
    expect(Fragment.isSupportedType('text/plain; charset=utf-8')).toBe(true);
    expect(Fragment.isSupportedType('text/markdown; charset=utf-8')).toBe(true);

    // Invalid content type formats
    expect(Fragment.isSupportedType('')).toBe(false);
    expect(Fragment.isSupportedType(null)).toBe(false);
    expect(Fragment.isSupportedType(undefined)).toBe(false);
    expect(Fragment.isSupportedType('invalid type')).toBe(false);

    // Unsupported but valid content types
    expect(Fragment.isSupportedType('audio/mp3')).toBe(false);
    expect(Fragment.isSupportedType('video/mp4')).toBe(false);
  });

  // Test error handling in save method
  test('save handles errors gracefully', async () => {
    const dataLayer = require('../../src/model/data');
    dataLayer.writeFragment.mockRejectedValue(new Error('Metadata write error'));

    const fragment = new Fragment({
      id: 'test-id',
      ownerId: 'owner-123',
      type: 'text/plain',
      size: 10,
    });

    await expect(fragment.save()).rejects.toThrow('Metadata write error');
  });
});
