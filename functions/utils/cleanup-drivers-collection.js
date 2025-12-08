/**
 * Cleanup Script: Remove collectionName field from drivers collection
 * 
 * This script removes the `collectionName` field from `fountainData` objects
 * in all documents in the `drivers` collection.
 * 
 * The `collectionName` field was used in the old system where webhook data
 * was stored in multiple collections. Now all webhook data goes to a single
 * `fountain_applicants` collection, so this field is no longer needed.
 * 
 * Usage:
 * 1. Deploy as a Firebase Function (one-time callable)
 * 2. Or run via Firebase CLI: firebase functions:shell
 * 3. Or run directly with Node.js (requires service account)
 * 
 * WARNING: This will modify all documents in the drivers collection!
 */

const { admin, db } = require("./firebase-init");

/**
 * Remove collectionName field from fountainData in drivers collection
 * This is a one-time cleanup to remove legacy collectionName references
 */
async function cleanupDriversCollection() {
  try {
    console.log("Starting cleanup: Removing collectionName from drivers collection...");
    
    const driversRef = db.collection("drivers");
    const snapshot = await driversRef.get();
    
    if (snapshot.empty) {
      console.log("No documents found in drivers collection.");
      return {
        success: true,
        message: "No documents to clean",
        updatedDocuments: 0,
      };
    }
    
    console.log(`Found ${snapshot.size} documents in drivers collection`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    // Process each document
    for (const docSnapshot of snapshot.docs) {
      const docData = docSnapshot.data();
      const docRef = docSnapshot.ref;
      
      // Check if fountainData exists and has collectionName
      if (docData.fountainData && docData.fountainData.collectionName !== undefined) {
        // Create updated fountainData without collectionName
        const updatedFountainData = { ...docData.fountainData };
        delete updatedFountainData.collectionName;
        
        // Update document to remove collectionName from fountainData
        batch.update(docRef, {
          fountainData: updatedFountainData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        batchCount++;
        updatedCount++;
        
        // Commit batch when it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`  Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      } else {
        skippedCount++;
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`  Committed final batch of ${batchCount} updates`);
    }
    
    console.log(`Cleanup complete! Updated ${updatedCount} documents, skipped ${skippedCount} documents.`);
    
    return {
      success: true,
      message: "Cleanup completed successfully",
      updatedDocuments: updatedCount,
      skippedDocuments: skippedCount,
      totalDocuments: snapshot.size,
    };
  } catch (error) {
    console.error("Error during cleanup:", error);
    throw error;
  }
}

/**
 * Firebase Function wrapper (optional - for one-time execution)
 * Uncomment and export if you want to run this as a callable function
 */
// exports.cleanupDriversCollection = functions.https.onCall(async (data, context) => {
//   // Optional: Add admin authentication check
//   // if (!context.auth || !context.auth.token.admin) {
//   //   throw new functions.https.HttpsError('permission-denied', 'Admin access required');
//   // }
//   
//   try {
//     const result = await cleanupDriversCollection();
//     return result;
//   } catch (error) {
//     console.error("Cleanup error:", error);
//     throw new functions.https.HttpsError(
//       "internal",
//       "Cleanup failed: " + error.message
//     );
//   }
// });

// Export for direct execution
module.exports = {
  cleanupDriversCollection,
};

// If running directly with Node.js
if (require.main === module) {
  cleanupDriversCollection()
    .then((result) => {
      console.log("Cleanup result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Cleanup failed:", error);
      process.exit(1);
    });
}

