/**
 * Migration Script: Delete all fountain_applicants_* collections
 * 
 * This script deletes all documents in collections that match the pattern
 * fountain_applicants_* (excluding the main fountain_applicants collection).
 * 
 * Usage:
 * 1. Deploy as a Firebase Function (one-time callable)
 * 2. Or run via Firebase CLI: firebase functions:shell
 * 3. Or run directly with Node.js (requires service account)
 * 
 * WARNING: This will permanently delete all data in matching collections!
 */

const { admin, db } = require("./firebase-init");

/**
 * Delete all fountain_applicants_* collections (except fountain_applicants)
 * This is a one-time migration to consolidate all webhook data into a single collection
 */
async function deleteFountainApplicantCollections() {
  try {
    console.log("Starting migration: Deleting fountain_applicants_* collections...");
    
    // List all collections
    const collections = await db.listCollections();
    const collectionsToDelete = [];
    
    // Find all collections matching fountain_applicants_* pattern
    // but exclude the main fountain_applicants collection
    for (const collection of collections) {
      const collectionId = collection.id;
      if (
        collectionId.startsWith("fountain_applicants_") &&
        collectionId !== "fountain_applicants"
      ) {
        collectionsToDelete.push(collectionId);
      }
    }
    
    if (collectionsToDelete.length === 0) {
      console.log("No matching collections found to delete.");
      return {
        success: true,
        message: "No collections to delete",
        deletedCollections: [],
        deletedDocuments: 0,
      };
    }
    
    console.log(`Found ${collectionsToDelete.length} collections to delete:`, collectionsToDelete);
    
    let totalDeletedDocs = 0;
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    // Delete all documents in each collection
    for (const collectionName of collectionsToDelete) {
      console.log(`Processing collection: ${collectionName}`);
      
      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();
      
      if (snapshot.empty) {
        console.log(`  Collection ${collectionName} is empty, skipping...`);
        continue;
      }
      
      console.log(`  Found ${snapshot.size} documents in ${collectionName}`);
      
      // Delete documents in batches
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        batchCount++;
        totalDeletedDocs++;
        
        // Commit batch when it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`  Committed batch of ${batchCount} deletions`);
          batchCount = 0;
        }
      }
    }
    
    // Commit any remaining deletions
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  Committed final batch of ${batchCount} deletions`);
    }
    
    console.log(`Migration complete! Deleted ${totalDeletedDocs} documents from ${collectionsToDelete.length} collections.`);
    
    return {
      success: true,
      message: "Migration completed successfully",
      deletedCollections: collectionsToDelete,
      deletedDocuments: totalDeletedDocs,
    };
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  }
}

/**
 * Firebase Function wrapper (optional - for one-time execution)
 * Uncomment and export if you want to run this as a callable function
 */
// exports.deleteFountainApplicantCollections = functions.https.onCall(async (data, context) => {
//   // Optional: Add admin authentication check
//   // if (!context.auth || !context.auth.token.admin) {
//   //   throw new functions.https.HttpsError('permission-denied', 'Admin access required');
//   // }
//   
//   try {
//     const result = await deleteFountainApplicantCollections();
//     return result;
//   } catch (error) {
//     console.error("Migration error:", error);
//     throw new functions.https.HttpsError(
//       "internal",
//       "Migration failed: " + error.message
//     );
//   }
// });

// Export for direct execution
module.exports = {
  deleteFountainApplicantCollections,
};

// If running directly with Node.js
if (require.main === module) {
  deleteFountainApplicantCollections()
    .then((result) => {
      console.log("Migration result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

