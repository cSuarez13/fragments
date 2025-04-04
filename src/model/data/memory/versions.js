// src/model/data/memory/versions.js

// Extensions to the memory DB functionality to support versions
const MemoryDB = require('./memory-db');

// Create in-memory databases for version metadata and data
const versionMetadata = new MemoryDB();
const versionData = new MemoryDB();

// Write a fragment version's metadata to memory db
function writeFragmentVersion(version) {
  const serialized = JSON.stringify(version);
  return versionMetadata.put(version.ownerId, version.id, serialized);
}

// Read a fragment version's metadata from memory db
async function readFragmentVersion(ownerId, versionId) {
  const serialized = await versionMetadata.get(ownerId, versionId);
  return typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
}

// Write a fragment version's data buffer to memory db
function writeFragmentVersionData(ownerId, versionId, buffer) {
  return versionData.put(ownerId, versionId, buffer);
}

// Read a fragment version's data from memory db
function readFragmentVersionData(ownerId, versionId) {
  return versionData.get(ownerId, versionId);
}

// List all versions for a specific fragment
async function listFragmentVersions(ownerId, fragmentId, expand = false) {
  try {
    // Get all version IDs for this owner
    const allVersionIds = Object.keys(versionMetadata.db[ownerId] || {});

    // Filter to only include versions of this fragment
    const fragmentVersionIds = allVersionIds.filter((versionId) =>
      versionId.startsWith(`${fragmentId}_v`)
    );

    if (fragmentVersionIds.length === 0) {
      return [];
    }

    // Get each version's metadata if expand is true
    if (expand) {
      const versions = await Promise.all(
        fragmentVersionIds.map(async (versionId) => {
          const version = await readFragmentVersion(ownerId, versionId);
          return version;
        })
      );

      // Filter out nulls and sort by version number (descending)
      return versions.filter((v) => v !== null).sort((a, b) => b.versionNum - a.versionNum);
    }

    // Otherwise just return the version IDs
    return fragmentVersionIds;
  } catch (error) {
    console.error('Error in listFragmentVersions:', error);
    return [];
  }
}

// Delete a fragment version and its data
async function deleteFragmentVersion(ownerId, versionId) {
  return Promise.all([
    versionMetadata.del(ownerId, versionId),
    versionData.del(ownerId, versionId),
  ]);
}

// Get the latest version number for a fragment
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
    console.error('Error getting latest version number:', error);
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
};
