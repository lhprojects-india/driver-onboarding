const admin = require("firebase-admin");

// Initialize Firebase Admin
// Try to get project ID from environment or .firebaserc
let projectId = process.env.GCLOUD_PROJECT || 
                process.env.GOOGLE_CLOUD_PROJECT ||
                process.env.FIREBASE_PROJECT_ID;

// If not set, try to read from .firebaserc (requires fs, but let's keep it simple)
if (!projectId) {
  try {
    const firebaserc = require('../../.firebaserc');
    projectId = firebaserc.projects?.default;
  } catch (e) {
    // Ignore if can't read
  }
}

// Initialize with explicit project ID if available
if (projectId && !admin.apps.length) {
  admin.initializeApp({
    projectId: projectId
  });
} else if (!admin.apps.length) {
  // Fallback to default initialization
  admin.initializeApp();
}

const db = admin.firestore();

module.exports = {
  admin,
  db,
};

