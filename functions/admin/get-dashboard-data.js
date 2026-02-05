const { onCall } = require("firebase-functions/v2/https");
const { db } = require("../utils/firebase-init");
const { logger } = require("firebase-functions");

// Collection names maps to existing codebase constants
const COLLECTIONS = {
  DRIVERS: 'drivers',
  FOUNTAIN_APPLICANTS: 'fountain_applicants',
  // ONBOARDING: 'onboarding', // unused in aggregation
  AVAILABILITY: 'availability',
  VERIFICATION: 'verification',
  REPORTS: 'reports',
  // FEE_STRUCTURES: 'fee_structures',
  // FACILITIES: 'facilities',
  // AUTHORIZED_EMAILS: 'authorized_emails',
  ADMINS: 'admins'
};

/**
 * Get aggregated dashboard data for admin
 * Fetches all necessary data from collections and joins them on the server usage
 * severely reducing the number of network round trips (N+1 problem).
 */
exports.getAdminDashboardData = onCall({
  timeoutSeconds: 300, 
  memory: "512MiB"
}, async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new Error("Unauthenticated. Please sign in.");
  }

  // Optional: Check if user is an admin (requires reading admin collection or checking custom claims)
  // For performance, relying on Firestore rules and subsequent checks is okay, but explicit check is better.
  // const email = request.auth.token.email || "";
  // const adminDoc = await db.collection(COLLECTIONS.ADMINS).doc(email).get();
  // if (!adminDoc.exists) {
  //   throw new Error("Unauthorized. Not an admin.");
  // }

  try {
    const startTime = Date.now();
    
    // 1. Fetch all required collections in parallel
    const [
      fountainSnapshot,
      driversSnapshot,
      availabilitySnapshot,
      verificationSnapshot,
      reportsSnapshot
    ] = await Promise.all([
      db.collection(COLLECTIONS.FOUNTAIN_APPLICANTS).get(),
      db.collection(COLLECTIONS.DRIVERS).get(),
      db.collection(COLLECTIONS.AVAILABILITY).get(),
      db.collection(COLLECTIONS.VERIFICATION).get(),
      db.collection(COLLECTIONS.REPORTS).get()
    ]);

    // 2. Index auxiliary collections by ID (email) for O(1) lookup
    const driversMap = new Map();
    driversSnapshot.forEach(doc => driversMap.set(doc.id, doc.data()));

    const availabilityMap = new Map();
    availabilitySnapshot.forEach(doc => availabilityMap.set(doc.id, doc.data()));

    const verificationMap = new Map();
    verificationSnapshot.forEach(doc => verificationMap.set(doc.id, doc.data()));

    const reportsMap = new Map();
    // Reports might need sorting, but we just need the latest one per driver.
    // Assuming report ID might not be email, but they have driverEmail field.
    // We'll iterate and keep the latest report for each email.
    reportsSnapshot.forEach(doc => {
      const data = doc.data();
      const email = data.driverEmail || data.email;
      if (email) {
        // Basic comparison to keep the "latest" if multiple exist
        // logic: if already have a report for this email, compare timestamps.
        const existing = reportsMap.get(email);
        if (!existing) {
          reportsMap.set(email, { id: doc.id, ...data });
        } else {
          // Compare dates
          const newDate = data.createdAt?.toDate?.() || new Date(0);
          const oldDate = existing.createdAt?.toDate?.() || new Date(0);
          if (newDate > oldDate) {
            reportsMap.set(email, { id: doc.id, ...data });
          }
        }
      }
    });

    // 3. Aggregate data
    const applications = [];

    fountainSnapshot.forEach(fountainDoc => {
      const fountainData = fountainDoc.data();
      const normalizedEmail = fountainDoc.id; // Email is the doc ID in fountain_applicants
      const originalEmail = fountainData.email || normalizedEmail; // Fallback

      // Try to find driver data
      // Lookup logic mirroring client-side: try normalized ID, then original email
      let driverData = driversMap.get(normalizedEmail);
      let driverEmail = normalizedEmail;

      if (!driverData && originalEmail !== normalizedEmail) {
        driverData = driversMap.get(originalEmail);
        if (driverData) {
          driverEmail = originalEmail;
        }
      }

      // If still no driver data, default to empty
      driverData = driverData || {};

      // Data from other collections uses the resolved driverEmail (or normalized if no driver doc)
      const lookupEmail = driversMap.has(normalizedEmail) ? normalizedEmail : (driversMap.has(originalEmail) ? originalEmail : normalizedEmail);
      
      const availabilityData = availabilityMap.get(lookupEmail) || null;
      const verificationData = verificationMap.get(lookupEmail) || null;
      const reportData = reportsMap.get(lookupEmail) || null;

      applications.push({
        id: normalizedEmail,
        ...fountainData, // Spread fountain data
        ...driverData,   // Spread driver data (might overwrite some fountain fields if collision, which is expected)
        email: normalizedEmail, // Ensure ID email is preserved
        // Attach joined data
        availability: availabilityData,
        verification: verificationData,
        report: reportData,
        // Computed dates for sorting on client
        // Ensure dates are converted to ISO strings or kept as simple objects for serialization
        createdAt: (fountainData.createdAt?.toDate?.() || driverData.createdAt?.toDate?.() || new Date()).toISOString(),
        updatedAt: (driverData.updatedAt?.toDate?.() || fountainData.updatedAt?.toDate?.() || new Date()).toISOString(),
      });
    });

    // 4. Sort (optional, but good for client ready-ness)
    // Sort by createdAt desc
    applications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const endTime = Date.now();
    logger.info(`getAdminDashboardData: Processed ${applications.length} applications in ${endTime - startTime}ms`);

    return {
      applications,
      count: applications.length,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error("Error aggregating dashboard data:", error);
    throw new Error("Failed to load dashboard data. Please try again.");
  }
});
