/**
 * List all collections in Firestore database
 * 
 * This script lists all collections and optionally shows document counts
 * 
 * Usage:
 *   node functions/utils/list-collections.js
 *   OR
 *   firebase functions:shell (then call listCollections())
 */

const { admin, db } = require("./firebase-init");

/**
 * List all collections in the database
 * @param {boolean} includeCounts - Whether to include document counts (slower)
 */
async function listCollections(includeCounts = true) {
  try {
    console.log("🔍 Fetching collections from Firestore...\n");
    
    // List all collections
    const collections = await db.listCollections();
    const collectionList = [];
    
    console.log(`Found ${collections.length} collection(s):\n`);
    
    // Get collection info
    for (const collectionRef of collections) {
      const collectionId = collectionRef.id;
      let docCount = null;
      
      if (includeCounts) {
        try {
          // Get document count (this requires reading all documents, so it can be slow)
          const snapshot = await collectionRef.get();
          docCount = snapshot.size;
        } catch (error) {
          console.warn(`  ⚠️  Could not get count for ${collectionId}: ${error.message}`);
        }
      }
      
      collectionList.push({
        name: collectionId,
        count: docCount
      });
      
      // Display collection info
      if (docCount !== null) {
        console.log(`  📦 ${collectionId.padEnd(30)} - ${docCount} document(s)`);
      } else {
        console.log(`  📦 ${collectionId}`);
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log(`Total collections: ${collections.length}`);
    
    if (includeCounts) {
      const totalDocs = collectionList.reduce((sum, col) => sum + (col.count || 0), 0);
      console.log(`Total documents: ${totalDocs}`);
    }
    
    return collectionList;
  } catch (error) {
    console.error("❌ Error listing collections:", error);
    throw error;
  }
}

// If run directly (not imported)
if (require.main === module) {
  const includeCounts = process.argv.includes('--no-counts') ? false : true;
  
  listCollections(includeCounts)
    .then(() => {
      console.log("\n✅ Done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Failed:", error);
      process.exit(1);
    });
}

module.exports = {
  listCollections,
};

