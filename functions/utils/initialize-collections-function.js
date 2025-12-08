/**
 * Cloud Function: Initialize Required Collections
 * 
 * This is a callable function that initializes all required Firestore collections.
 * Only accessible by admins.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { admin, db } = require("./firebase-init");

/**
 * Initialize all required collections
 */
exports.initializeCollections = onCall(async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get user email
    const userEmail = request.auth.token.email || 
                     (request.auth.token.claims && request.auth.token.claims.email);
    
    // Check if user is admin
    const adminEmails = [
      'hari@laundryheap.com',
      'admin@laundryheap.com',
      'bharath@laundryheap.com',
      'sudhanva@laundryheap.com'
    ];
    
    if (!adminEmails.includes(userEmail)) {
      throw new HttpsError("permission-denied", "Only admins can initialize collections");
    }

    console.log(`Initializing collections requested by: ${userEmail}`);
    
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
          
          results.push({
            collection: collection.name,
            status: 'created',
            message: 'Collection initialized with placeholder document',
            description: collection.description
          });
        } else {
          results.push({
            collection: collection.name,
            status: 'exists',
            message: 'Collection already contains documents',
            description: collection.description
          });
        }
      } catch (error) {
        console.error(`Error initializing ${collection.name}:`, error.message);
        results.push({
          collection: collection.name,
          status: 'error',
          message: error.message,
          description: collection.description
        });
      }
    }
    
    return {
      success: true,
      collections: results,
      totalCollections: collections.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error initializing collections:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to initialize collections", error.message);
  }
});

/**
 * Clean up placeholder documents
 */
exports.cleanupPlaceholders = onCall(async (request) => {
  try {
    // Check if user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Get user email
    const userEmail = request.auth.token.email || 
                     (request.auth.token.claims && request.auth.token.claims.email);
    
    // Check if user is admin
    const adminEmails = [
      'hari@laundryheap.com',
      'admin@laundryheap.com',
      'bharath@laundryheap.com',
      'sudhanva@laundryheap.com'
    ];
    
    if (!adminEmails.includes(userEmail)) {
      throw new HttpsError("permission-denied", "Only admins can cleanup placeholders");
    }

    console.log(`Cleaning up placeholders requested by: ${userEmail}`);
    
    const collections = ['fountain_applicants', 'onboarding', 'verification'];
    const results = [];
    let deletedCount = 0;
    
    for (const collectionName of collections) {
      try {
        const placeholderRef = db.collection(collectionName).doc('_placeholder');
        const placeholderDoc = await placeholderRef.get();
        
        if (placeholderDoc.exists) {
          await placeholderRef.delete();
          deletedCount++;
          results.push({
            collection: collectionName,
            status: 'deleted',
            message: 'Placeholder document deleted'
          });
        } else {
          results.push({
            collection: collectionName,
            status: 'not_found',
            message: 'No placeholder document found'
          });
        }
      } catch (error) {
        console.error(`Error cleaning up ${collectionName}:`, error.message);
        results.push({
          collection: collectionName,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      success: true,
      deletedCount,
      results,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Error cleaning up placeholders:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Failed to cleanup placeholders", error.message);
  }
});

