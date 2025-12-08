/**
 * LEGACY: Helper function to automatically generate collection name from webhook data
 * No longer used - all webhook data now goes to single fountain_applicants collection
 * Kept for reference only
 */
function generateCollectionName(webhookData) {
  const funnel = webhookData.funnel || webhookData;
  const location = funnel.location || {};
  const position = funnel.position || {};
  
  // Extract city - use city field, fallback to name
  const city = (location.city || location.name || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Extract role - smart parsing for position names like "Partner Driver - Kildare"
  let role = position.name || 'partner_driver';
  
  // If position contains " - ", take only the part before the dash
  if (role.includes(' - ')) {
    role = role.split(' - ')[0].trim();
  }
  
  // Clean up the role name
  role = role
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return `fountain_applicants_${city}_${role}`;
}

/**
 * LEGACY: Get all collection names to search for applicants
 * No longer used - all applicants are now in single fountain_applicants collection
 * Kept for reference only
 */
async function getCollectionsToSearch(db, FUNNEL_COLLECTION_MAP, DEFAULT_COLLECTION) {
  const collectionsToSearch = [
    DEFAULT_COLLECTION,
    ...Object.values(FUNNEL_COLLECTION_MAP),
  ].filter(Boolean);
  
  // Add all fountain_applicants_* collections dynamically
  try {
    const allCollections = await db.listCollections();
    for (const collection of allCollections) {
      if (collection.id && collection.id.startsWith('fountain_applicants_') && 
          !collectionsToSearch.includes(collection.id)) {
        collectionsToSearch.push(collection.id);
      }
    }
  } catch (listError) {
    console.warn("Could not list all collections, using default:", listError.message);
  }
  
  return collectionsToSearch;
}

module.exports = {
  generateCollectionName,
  getCollectionsToSearch,
};

