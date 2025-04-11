// tests/unit/fragment-version.test.js
const { FragmentVersion } = require('../../src/model/fragment-version');

describe('FragmentVersion class', () => {
  describe('constructor', () => {
    test('creates a new FragmentVersion with required properties', () => {
      const version = new FragmentVersion({
        fragmentId: 'fragment-123',
        ownerId: 'owner-123',
        type: 'text/plain',
        size: 10,
        versionNum: 1,
      });

      expect(version.fragmentId).toBe('fragment-123');
      expect(version.ownerId).toBe('owner-123');
      expect(version.type).toBe('text/plain');
      expect(version.size).toBe(10);
      expect(version.versionNum).toBe(1);
      expect(version.id).toBe('fragment-123_v1');
      expect(version.created).toBeDefined();
      expect(version.updated).toBeDefined();
    });

    test('uses provided id if one is given', () => {
      const version = new FragmentVersion({
        id: 'custom-id',
        fragmentId: 'fragment-123',
        ownerId: 'owner-123',
        type: 'text/plain',
        size: 10,
        versionNum: 1,
      });

      expect(version.id).toBe('custom-id');
    });

    test('uses provided created and updated dates if given', () => {
      const created = '2023-01-01T00:00:00.000Z';
      const updated = '2023-01-02T00:00:00.000Z';

      const version = new FragmentVersion({
        fragmentId: 'fragment-123',
        ownerId: 'owner-123',
        type: 'text/plain',
        size: 10,
        versionNum: 1,
        created,
        updated,
      });

      expect(version.created).toBe(created);
      expect(version.updated).toBe(updated);
    });

    test('throws if fragmentId is missing', () => {
      expect(
        () =>
          new FragmentVersion({
            ownerId: 'owner-123',
            type: 'text/plain',
            size: 10,
            versionNum: 1,
          })
      ).toThrow('fragmentId is required');
    });

    test('throws if ownerId is missing', () => {
      expect(
        () =>
          new FragmentVersion({
            fragmentId: 'fragment-123',
            type: 'text/plain',
            size: 10,
            versionNum: 1,
          })
      ).toThrow('ownerId is required');
    });

    test('throws if type is missing', () => {
      expect(
        () =>
          new FragmentVersion({
            fragmentId: 'fragment-123',
            ownerId: 'owner-123',
            size: 10,
            versionNum: 1,
          })
      ).toThrow('type is required');
    });

    test('throws if size is not a number', () => {
      expect(
        () =>
          new FragmentVersion({
            fragmentId: 'fragment-123',
            ownerId: 'owner-123',
            type: 'text/plain',
            size: '10',
            versionNum: 1,
          })
      ).toThrow('size must be a number');
    });

    test('throws if versionNum is missing', () => {
      expect(
        () =>
          new FragmentVersion({
            fragmentId: 'fragment-123',
            ownerId: 'owner-123',
            type: 'text/plain',
            size: 10,
          })
      ).toThrow('versionNum must be a number');
    });

    test('throws if versionNum is not a number', () => {
      expect(
        () =>
          new FragmentVersion({
            fragmentId: 'fragment-123',
            ownerId: 'owner-123',
            type: 'text/plain',
            size: 10,
            versionNum: '1',
          })
      ).toThrow('versionNum must be a number');
    });
  });

  describe('static methods', () => {
    describe('toVersionId', () => {
      test('combines fragmentId and versionNum into correct format', () => {
        const versionId = FragmentVersion.toVersionId('fragment-123', 5);
        expect(versionId).toBe('fragment-123_v5');
      });
    });

    describe('parseVersionId', () => {
      test('extracts fragmentId and versionNum from versionId', () => {
        const result = FragmentVersion.parseVersionId('fragment-123_v5');
        expect(result).toEqual({
          fragmentId: 'fragment-123',
          versionNum: 5,
        });
      });

      test('handles UUIDs correctly', () => {
        const uuidVersionId = '123e4567-e89b-12d3-a456-426614174000_v2';
        const result = FragmentVersion.parseVersionId(uuidVersionId);
        expect(result).toEqual({
          fragmentId: '123e4567-e89b-12d3-a456-426614174000',
          versionNum: 2,
        });
      });

      test('throws error for invalid version ID format', () => {
        expect(() => FragmentVersion.parseVersionId('invalid-id-format')).toThrow(
          'Invalid version ID format'
        );
      });

      test('throws error for invalid version number', () => {
        expect(() => FragmentVersion.parseVersionId('fragment-123_vNaN')).toThrow(
          'Invalid version number'
        );
      });
    });
  });
});
