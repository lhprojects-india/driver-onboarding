/**
 * Cloud Function: List all collections in Firestore
 * 
 * This is a callable function that lists all collections and their document counts
 * Only accessible by admins
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("./firebase-init");

/**
 * List all collections in the database
 */
exports.listCollections = onCall(async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get user email
    const userEmail = request.auth.token.email || 
                     (request.auth.token.claims && request.auth.token.claims.email);
    
    // Check if user is admin (you can customize this check)
    const adminEmails = [
      'hari@laundryheap.com',
      'admin@laundryheap.com',
      'bharath@laundryheap.com',
      'sudhanva@laundryheap.com'
    ];
    
    if (!adminEmails.includes(userEmail)) {
      throw new HttpsError("permission-denied", "Only admins can list collections");
    }

    // List all collections
    const collections = await db.listCollections();
    const collectionList = [];
    
    // Get collection info with document counts
    for (const collectionRef of collections) {
      const collectionId = collectionRef.id;
      let docCount = 0;
      
      try {
        // Get document count
        const snapshot = await collectionRef.get();
        docCount = snapshot.size;
      } catch (error) {
        console.warn(`Could not get count for ${collectionId}: ${error.message}`);
      }
      
      collectionList.push({
        name: collectionId,
        count: docCount
      });
    }
    
    // Sort by name
    collectionList.sort((a, b) => a.name.localeCompare(b.name));
    
    const totalDocs = collectionList.reduce((sum, col) => sum + col.count, 0);
    
    return {
      success: true,
      collections: collectionList,
      totalCollections: collectionList.length,
      totalDocuments: totalDocs,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error listing collections:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to list collections", error.message);
  }
});

