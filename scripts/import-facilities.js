/**
 * Script to import facilities from JSON file to Firestore
 * Run with: node scripts/import-facilities.js
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read and parse the JSON file
const facilityDataPath = join(__dirname, "../src/assets/facility-data.json");
const facilityData = JSON.parse(readFileSync(facilityDataPath, "utf-8"));

// Initialize Firebase Admin
// Try to use service account if available, otherwise use default credentials
let initialized = false;
try {
  const serviceAccount = JSON.parse(readFileSync(join(__dirname, "../serviceAccountKey.json"), "utf-8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  initialized = true;
  console.log("✅ Using service account credentials");
} catch (error) {
  console.log("⚠️ No serviceAccountKey.json found, trying default credentials...");
  try {
    // Try to get project ID from .firebaserc
    const firebaserc = JSON.parse(readFileSync(join(__dirname, "../.firebaserc"), "utf-8"));
    const projectId = firebaserc.projects?.default || firebaserc.projects?.production;
    
    if (projectId) {
      admin.initializeApp({
        projectId: projectId
      });
      initialized = true;
      console.log(`✅ Using default credentials with project: ${projectId}`);
    } else {
      throw new Error("No project ID found");
    }
  } catch (err) {
    console.error("❌ Failed to initialize Firebase Admin:", err.message);
    console.error("Please ensure serviceAccountKey.json exists or Firebase is configured.");
    process.exit(1);
  }
}

const db = admin.firestore();

async function importFacilities() {
  console.log(`🚀 Starting import of ${facilityData.length} facilities...`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const facility of facilityData) {
    try {
      const facilityCode = facility.Facility;
      if (!facilityCode) {
        throw new Error("Facility code is missing");
      }

      const facilityRef = db.collection("facilities").doc(facilityCode);
      
      await facilityRef.set({
        city: facility.City,
        facility: facilityCode,
        address: facility.Address,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      results.success++;
      console.log(`✅ Imported: ${facilityCode} - ${facility.City}`);
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to import ${facility.Facility}: ${error.message}`);
      console.error(`❌ Failed to import ${facility.Facility}:`, error.message);
    }
  }

  console.log("\n📊 Import Summary:");
  console.log(`✅ Success: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log("\n❌ Errors:");
    results.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (results.success > 0) {
    console.log("\n✅ Import completed successfully!");
  } else {
    console.log("\n❌ Import failed. Please check the errors above.");
    process.exit(1);
  }
}

// Run the import
importFacilities()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });

