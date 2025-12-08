// Legacy: Job Post Mapping - No longer used (kept for backward compatibility)
// All webhook data is now stored in a single collection: fountain_applicants
const FUNNEL_COLLECTION_MAP = {
  // Legacy mapping - not used anymore
};

// Single collection for all Fountain webhook data
// All applicants are stored here, classified by city field in the document
const DEFAULT_COLLECTION = "fountain_applicants";

module.exports = {
  FUNNEL_COLLECTION_MAP,
  DEFAULT_COLLECTION,
};

