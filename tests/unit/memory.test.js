const memory = require('../../src/model/data/memory/index');
const { v4: uuidv4 } = require('uuid');

describe('In-Memory Database Tests', () => {
  const ownerId = 'test-user';
  const fragmentId = uuidv4();
  const testFragment = {
    id: fragmentId,
    ownerId,
    type: 'text/plain',
    size: 11,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  const testData = Buffer.from('Hello World');

  beforeEach(async () => {
    // Reset database before each test
    await memory.writeFragment(testFragment);
    await memory.writeFragmentData(ownerId, fragmentId, testData);
  });

  afterEach(async () => {
    // Clean up after each test
    const existingFragment = await memory.readFragment(ownerId, fragmentId);

    if (existingFragment) {
      await memory.deleteFragment(ownerId, fragmentId);
    }
  });

  test('writeFragment stores fragment metadata', async () => {
    const fragment = await memory.readFragment(ownerId, fragmentId);
    expect(fragment).toBeDefined();
    expect(fragment.id).toBe(fragmentId);
    expect(fragment.ownerId).toBe(ownerId);
    expect(fragment.type).toBe('text/plain');
  });

  test('readFragment retrieves stored fragment metadata', async () => {
    const fragment = await memory.readFragment(ownerId, fragmentId);
    expect(fragment).toBeDefined();
    expect(fragment.id).toBe(fragmentId);
    expect(fragment.ownerId).toBe(ownerId);
  });

  test('writeFragmentData stores fragment data', async () => {
    const retrievedData = await memory.readFragmentData(ownerId, fragmentId);
    expect(retrievedData).toEqual(testData);
  });

  test('readFragmentData retrieves stored fragment data', async () => {
    const data = await memory.readFragmentData(ownerId, fragmentId);
    expect(data).toBeDefined();
    expect(data.toString()).toBe('Hello World');
  });

  test('deleteFragment removes fragment metadata and data', async () => {
    // Delete the fragment
    await memory.deleteFragment(ownerId, fragmentId);

    // Verify it was deleted
    const fragmentAfterDelete = await memory.readFragment(ownerId, fragmentId);
    const dataAfterDelete = await memory.readFragmentData(ownerId, fragmentId);

    expect(fragmentAfterDelete).toBeUndefined();
    expect(dataAfterDelete).toBeUndefined();
  });

  test('listFragments returns empty array for user with no fragments', async () => {
    await memory.deleteFragment(ownerId, fragmentId);
    const fragments = await memory.listFragments(ownerId);
    expect(fragments).toEqual([]);
  });

  test('listFragments returns a list of fragment ids for existing fragments', async () => {
    const fragments = await memory.listFragments(ownerId);
    expect(fragments).toContain(fragmentId);
  });

  test('listFragments returns expanded fragment objects when requested', async () => {
    const fragments = await memory.listFragments(ownerId, true);
    expect(fragments).toContainEqual(testFragment);
  });
});
