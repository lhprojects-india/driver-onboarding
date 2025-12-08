/**
 * Simple script to initialize collections using Firebase CLI
 * This version uses firebase-admin with explicit project configuration
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Get project ID from .firebaserc
let projectId = "driver-onboarding-lh"; // default
try {
  const firebasercPath = path.join(__dirname, "../../.firebaserc");
  const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, "utf8"));
  projectId = firebaserc.projects?.default || projectId;
} catch (e) {
  console.log("Using default project ID:", projectId);
}

// Initialize Firebase Admin with explicit project
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      projectId: projectId
    });
    console.log(`✓ Initialized Firebase Admin for project: ${projectId}`);
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error.message);
    console.log("\n💡 Tip: Make sure you're logged in with Firebase CLI:");
    console.log("   firebase login");
    console.log("\n   Or set application default credentials:");
    console.log("   gcloud auth application-default login");
    process.exit(1);
  }
}

const db = admin.firestore();

async function initializeCollections() {
  try {
    console.log("🔧 Initializing required Firestore collections...\n");
    
    const collections = [
      {
        name: 'fountain_applicants',
        description: 'Stores applicant data from Fountain webhooks'
      },
      {
        name: 'onboarding',
        description: 'Tracks onboarding progress for each driver'
      },
      {
        name: 'verification',
        description: 'Stores phone verification status for drivers'
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
          await placeholderRef.set({
            _initialized: true,
            _note: 'This is a placeholder document. Real documents will be created automatically.',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log(`  ✅ Created collection: ${collection.name}`);
          console.log(`     ${collection.description}`);
          results.push({
            collection: collection.name,
            status: 'created'
          });
        } else {
          console.log(`  ✓ Collection already exists: ${collection.name}`);
          results.push({
            collection: collection.name,
            status: 'exists'
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
      collections: results
    };
  } catch (error) {
    console.error("❌ Error initializing collections:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeCollections()
    .then(() => {
      console.log("\n✅ Done!");
      console.log("\n💡 You can delete the '_placeholder' documents from each collection");
      console.log("   in the Firebase Console if you want.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Failed:", error.message);
      console.log("\n💡 Try running: firebase login");
      process.exit(1);
    });
}

module.exports = { initializeCollections };

