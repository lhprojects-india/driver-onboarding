/**
 * Initialize Required Firestore Collections
 * 
 * This script ensures all required collections exist in Firestore.
 * In Firestore, collections are created automatically when you write the first document,
 * but this script creates placeholder documents to ensure the collections exist.
 * 
 * Usage:
 *   node functions/utils/initialize-collections.js
 *   OR
 *   firebase functions:shell (then call initializeCollections())
 */

const { admin, db } = require("./firebase-init");

/**
 * Initialize all required collections
 * Creates placeholder documents to ensure collections exist
 */
async function initializeCollections() {
  try {
    console.log("🔧 Initializing required Firestore collections...\n");
    
    const collections = [
      {
        name: 'fountain_applicants',
        description: 'Stores applicant data from Fountain webhooks',
        placeholderDoc: {
          _initialized: true,
          _note: 'This is a placeholder document. Real documents will be created by the Fountain webhook.',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      },
      {
        name: 'onboarding',
        description: 'Tracks onboarding progress for each driver',
        placeholderDoc: {
          _initialized: true,
          _note: 'This is a placeholder document. Real documents will be created during the onboarding process.',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      },
      {
        name: 'verification',
        description: 'Stores phone verification status for drivers',
        placeholderDoc: {
          _initialized: true,
          _note: 'This is a placeholder document. Real documents will be created during phone verification.',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }
      }
    ];

    const results = [];
    
    for (const collection of collections) {
      try {
        // Check if collection exists by trying to list documents
        const collectionRef = db.collection(collection.name);
        const snapshot = await collectionRef.limit(1).get();
        
        if (snapshot.empty) {
          // Collection doesn't exist or is empty, create placeholder
          const placeholderRef = collectionRef.doc('_placeholder');
          await placeholderRef.set(collection.placeholderDoc);
          
          console.log(`  ✅ Created collection: ${collection.name}`);
          console.log(`     ${collection.description}`);
          results.push({
            collection: collection.name,
            status: 'created',
            message: 'Collection initialized with placeholder document'
          });
        } else {
          console.log(`  ✓ Collection already exists: ${collection.name}`);
          results.push({
            collection: collection.name,
            status: 'exists',
            message: 'Collection already contains documents'
          });
        }
      } catch (error) {
        console.error(`  ❌ Error initializing ${collection.name}:`, error.message);
        results.push({
          collection: collection.name,
          status: 'error',
          message: error.message
        });
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("Initialization complete!");
    console.log(`Collections processed: ${collections.length}`);
    
    return {
      success: true,
      collections: results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("❌ Error initializing collections:", error);
    throw error;
  }
}

/**
 * Clean up placeholder documents (optional)
 * Call this after verifying collections exist
 */
async function cleanupPlaceholders() {
  try {
    console.log("🧹 Cleaning up placeholder documents...\n");
    
    const collections = ['fountain_applicants', 'onboarding', 'verification'];
    let deletedCount = 0;
    
    for (const collectionName of collections) {
      try {
        const placeholderRef = db.collection(collectionName).doc('_placeholder');
        const placeholderDoc = await placeholderRef.get();
        
        if (placeholderDoc.exists) {
          await placeholderRef.delete();
          console.log(`  ✅ Deleted placeholder from ${collectionName}`);
          deletedCount++;
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not delete placeholder from ${collectionName}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount} placeholder document(s).`);
    return { success: true, deletedCount };
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

// If run directly (not imported)
if (require.main === module) {
  initializeCollections()
    .then((result) => {
      console.log("\n✅ Done!");
      console.log("\nNote: Placeholder documents were created to ensure collections exist.");
      console.log("You can delete them manually or run cleanupPlaceholders() after verifying.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Failed:", error);
      process.exit(1);
    });
}

module.exports = {
  initializeCollections,
  cleanupPlaceholders,
};

