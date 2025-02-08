const MemoryDB = require('./memory-db');

// Create two in-memory databases: one for fragment metadata and the other for raw data
const data = new MemoryDB();
const metadata = new MemoryDB();

// Write a fragment's metadata to memory db. Returns a Promise<void>
function writeFragment(fragment) {
  // Simulate db/network serialization of the value, storing only JSON representation.
  // This is important because it's how things will work later with AWS data stores.
  const serialized = JSON.stringify(fragment);
  return metadata.put(fragment.ownerId, fragment.id, serialized);
}

// Read a fragment's metadata from memory db. Returns a Promise<Object>
async function readFragment(ownerId, id) {
  // NOTE: this data will be raw JSON, we need to turn it back into an Object.
  // You'll need to take care of converting this back into a Fragment instance
  // higher up in the callstack.
  const serialized = await metadata.get(ownerId, id);
  return typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
}

// Write a fragment's data buffer to memory db. Returns a Promise
function writeFragmentData(ownerId, id, buffer) {
  return data.put(ownerId, id, buffer);
}

// Read a fragment's data from memory db. Returns a Promise
function readFragmentData(ownerId, id) {
  return data.get(ownerId, id);
}

// Get a list of fragment ids/objects for the given user from memory db. Returns a Promise
async function listFragments(ownerId, expand = false) {
  try {
    const fragments = await metadata.query(ownerId);

    console.log('Raw fragments from DB:', fragments);
    console.log('Fragments type:', typeof fragments);
    console.log('Fragments length:', fragments.length);

    // More detailed logging and filtering
    const parsedFragments = fragments
      .map((fragment, index) => {
        console.log(`Fragment ${index}:`, fragment);
        try {
          // Ensure we're parsing string fragments
          if (typeof fragment === 'string') {
            return JSON.parse(fragment);
          }
          // If it's already an object, validate it
          return fragment && typeof fragment === 'object' ? fragment : null;
        } catch (err) {
          console.error(`Error parsing fragment ${index}:`, err);
          return null;
        }
      })
      .filter((fragment) => {
        const isValid = fragment != null && typeof fragment === 'object' && fragment.id != null;
        if (!isValid) {
          console.warn('Invalid fragment:', fragment);
        }
        return isValid;
      });

    console.log('Parsed fragments:', parsedFragments);

    if (expand) {
      return parsedFragments;
    }

    const fragmentIds = parsedFragments.map((fragment) => fragment.id);
    console.log('Fragment IDs:', fragmentIds);

    return fragmentIds;
  } catch (error) {
    console.error('Error in listFragments:', error);
    return [];
  }
}

// Delete a fragment's metadata and data from memory db. Returns a Promise
function deleteFragment(ownerId, id) {
  return Promise.all([
    // Delete metadata
    metadata.del(ownerId, id),
    // Delete data
    data.del(ownerId, id),
  ]);
}

module.exports.listFragments = listFragments;
module.exports.writeFragment = writeFragment;
module.exports.readFragment = readFragment;
module.exports.writeFragmentData = writeFragmentData;
module.exports.readFragmentData = readFragmentData;
module.exports.deleteFragment = deleteFragment;
