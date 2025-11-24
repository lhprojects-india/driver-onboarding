const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Helper function to automatically generate collection name from webhook data
function generateCollectionName(webhookData) {
  const funnel = webhookData.funnel || webhookData;
  const location = funnel.location || {};
  const position = funnel.position || {};
  
  // Extract city - use city field, fallback to name
  const city = (location.city || location.name || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  // Extract role - smart parsing for position names like "Partner Driver - Kildare"
  let role = position.name || 'partner_driver';
  
  // If position contains " - ", take only the part before the dash
  if (role.includes(' - ')) {
    role = role.split(' - ')[0].trim();
  }
  
  // Clean up the role name
  role = role
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return `fountain_applicants_${city}_${role}`;
}

// Legacy: Job Post Mapping - Kept for backward compatibility
// Only needed if you want specific control over collection names
const FUNNEL_COLLECTION_MAP = {
  // "d1993025-8f9c-4ecf-9016-e92c08392f56": "fountain_applicants_dublin_partner_driver",
};

// Default collection if funnel ID not mapped
const DEFAULT_COLLECTION = "fountain_applicants";

/**
 * Fountain Webhook Handler
 * Receives webhook data from Fountain when an applicant reaches a certain stage
 * Stores the applicant data in Firestore for later verification
 */
exports.fountainWebhook = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  return cors(req, res, async () => {
    try {
      // Log the webhook call
      console.log("Fountain webhook received", {
        method: req.method,
        headers: req.headers,
        body: req.body,
      });

      // Health check endpoint
      if (req.method === "GET") {
        return res.status(200).send("Fountain webhook is operational");
      }

      // Only accept POST requests for webhook data
      if (req.method !== "POST") {
        return res.status(405).json({
          success: false,
          error: "Method not allowed. Use POST for webhook data.",
        });
      }

      // Verify webhook authentication (optional - only if secret is configured)
      // Option 1: Check for API key in Authorization header (Bearer token)
      const authHeader = req.headers.authorization;
      let webhookSecret = null;
      
      try {
        webhookSecret = process.env.FOUNTAIN_WEBHOOK_SECRET || 
                       (functions.config && functions.config().fountain && functions.config().fountain.webhook_secret);
      } catch (error) {
        // functions.config() may not be available, that's OK - webhook stays open
        console.log("Note: Webhook secret not configured, allowing open access");
      }
      
      if (webhookSecret) {
        // If secret is configured, require authentication
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: "Unauthorized",
            message: "Missing or invalid Authorization header. Expected: Bearer <token>",
          });
        }
        
        const providedToken = authHeader.replace('Bearer ', '');
        if (providedToken !== webhookSecret) {
          return res.status(403).json({
            success: false,
            error: "Forbidden",
            message: "Invalid webhook token",
          });
        }
      }

      // Option 2: Verify webhook signature if Fountain provides one
      // const signature = req.headers["x-fountain-signature"];
      // TODO: Implement signature verification when available

      // Extract webhook data
      const webhookData = req.body;

      // Validate required fields
      if (!webhookData) {
        return res.status(400).json({
          success: false,
          error: "No data received",
        });
      }

      // Common Fountain webhook fields
      // Adjust these based on your actual Fountain webhook payload
      const {
        email,
        phone,
        phone_number,
        mobile,
        name,
        first_name,
        last_name,
        applicant_id,
        application_id,
        stage,
        status,
        city,
        data,
      } = webhookData;

      // Flexible field mapping - Fountain may use different field names
      // Extract from multiple possible locations including deeply nested applicant data
      const applicantEmail = email || 
        data?.email || 
        webhookData.applicant?.email;
        
      const applicantPhone = phone || 
        phone_number || 
        mobile ||
        data?.phone || 
        data?.phone_number || 
        webhookData.applicant?.phone ||
        webhookData.applicant?.phone_number ||
        webhookData.applicant?.normalized_phone_number;
        
      const applicantName = name || 
        `${first_name || ""} ${last_name || ""}`.trim() ||
        data?.name || 
        webhookData.applicant?.name ||
        (webhookData.applicant?.first_name && webhookData.applicant?.last_name
          ? `${webhookData.applicant.first_name} ${webhookData.applicant.last_name}`.trim()
          : null);
          
      const applicantId = applicant_id || 
        application_id ||
        data?.applicant_id || 
        webhookData.applicant?.id;

      // Validate email is present
      if (!applicantEmail) {
        console.error("No email found in webhook data", webhookData);
        return res.status(400).json({
          success: false,
          error: "Email is required",
        });
      }

      // Normalize email
      const normalizedEmail = applicantEmail.toLowerCase().trim();

      // Extract funnel/job post information from multiple possible locations
      const funnelId = webhookData.funnel?.id || 
        webhookData.applicant?.funnel?.id ||
        data?.funnel?.id || 
        null;
        
      const locationCity = webhookData.funnel?.location?.city ||
        webhookData.funnel?.location?.name ||
        webhookData.applicant?.funnel?.location?.city ||
        webhookData.applicant?.funnel?.location?.name ||
        webhookData.location?.city ||
        data?.location?.city || 
        city || 
        null;
        
      const locationCountry = webhookData.funnel?.location?.country_code ||
        webhookData.funnel?.location?.address_detail?.country_code ||
        webhookData.applicant?.funnel?.location?.country_code ||
        webhookData.applicant?.funnel?.location?.address_detail?.country_code ||
        webhookData.location?.country_code ||
        data?.location?.country_code || 
        null;

      // Determine which collection to use
      // Priority: 1) FUNNEL_COLLECTION_MAP (if manually mapped), 2) Auto-generate from webhook data
      let collectionName;
      if (funnelId && FUNNEL_COLLECTION_MAP[funnelId]) {
        // Use manual mapping if exists
        collectionName = FUNNEL_COLLECTION_MAP[funnelId];
      } else {
        // Auto-generate collection name from webhook data
        collectionName = generateCollectionName(webhookData);
      }

      // Prepare applicant data for Firestore
      const applicantData = {
        email: normalizedEmail,
        phone: applicantPhone || null,
        name: applicantName || null,
        applicantId: applicantId || null,
        funnelId: funnelId,
        stage: stage || null,
        status: status || null,
        city: locationCity,
        country: locationCountry,
        collectionName: collectionName, // Track which collection this is in
        fountainData: webhookData, // Store complete webhook payload
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        webhookReceivedAt: new Date().toISOString(),
        isActive: true,
      };

      // Store in the appropriate collection based on funnel ID
      const docRef = db.collection(collectionName).doc(normalizedEmail);

      console.log(`Storing applicant in collection: ${collectionName}`);

      // Check if applicant already exists
      const existingDoc = await docRef.get();

      // Use .exists property (not method) for Admin SDK
      // Defensive check: handle both property and method cases
      const docExists = typeof existingDoc.exists === 'function' 
        ? existingDoc.exists() 
        : existingDoc.exists;

      if (docExists) {
        // Update existing applicant
        const existingData = existingDoc.data();
        await docRef.update({
          ...applicantData,
          createdAt: existingData?.createdAt || applicantData.createdAt, // Keep original creation time
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("Updated existing applicant:", normalizedEmail);
      } else {
        // Create new applicant record
        await docRef.set(applicantData);

        console.log("Created new applicant:", normalizedEmail);
      }

      // Send success response
      return res.status(200).json({
        success: true,
        message: "Applicant data received and stored successfully",
        email: normalizedEmail,
        applicantId: applicantId,
        collection: collectionName,
        city: locationCity,
      });
    } catch (error) {
      console.error("Error processing Fountain webhook:", error);

      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: error.message,
      });
    }
  });
});

/**
 * Verify Applicant Phone Number
 * Callable function (same approach as checkFountainEmail) - no CORS issues
 * Verifies if phone number matches the email in Fountain applicant data
 */
exports.verifyApplicantPhone = functions.https.onCall(async (data, context) => {
  try {
    const { email, phone } = data;

    // Validate inputs
    if (!email || !phone) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Email and phone number are required",
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get all collection names to search
    const collectionsToSearch = [
      DEFAULT_COLLECTION,
      ...Object.values(FUNNEL_COLLECTION_MAP),
    ].filter(Boolean);
    
    // Add all fountain_applicants_* collections dynamically
    try {
      const allCollections = await db.listCollections();
      for (const collection of allCollections) {
        if (collection.id && collection.id.startsWith('fountain_applicants_') && 
            !collectionsToSearch.includes(collection.id)) {
          collectionsToSearch.push(collection.id);
        }
      }
    } catch (listError) {
      console.warn("Could not list all collections, using default:", listError.message);
    }

    // Search through all collections
    for (const collectionName of collectionsToSearch) {
      const applicantDoc = await db.collection(collectionName)
          .doc(normalizedEmail)
          .get();

      if (applicantDoc.exists) {
        const applicantData = applicantDoc.data();

        // Extract phone from multiple possible locations (same as webhook handler)
        const storedPhone = applicantData.phone || 
                          applicantData.fountainData?.phone ||
                          applicantData.fountainData?.phone_number ||
                          applicantData.fountainData?.applicant?.phone ||
                          applicantData.fountainData?.applicant?.phone_number ||
                          applicantData.fountainData?.data?.phone ||
                          applicantData.fountainData?.data?.phone_number ||
                          applicantData.fountainData?.mobile ||
                          null;

        // Normalize phone numbers for comparison (remove spaces, dashes, parentheses)
        const normalizePhone = (phoneStr) => {
          if (!phoneStr) return "";
          return phoneStr.replace(/[\s\-\(\)\+]/g, "");
        };

        const normalizedInputPhone = normalizePhone(phone);
        const normalizedStoredPhone = normalizePhone(storedPhone);
        
        // Log for debugging
        console.log('Phone verification:', {
          email: normalizedEmail,
          inputPhone: phone,
          normalizedInput: normalizedInputPhone,
          storedPhone: storedPhone,
          normalizedStored: normalizedStoredPhone,
          match: normalizedInputPhone === normalizedStoredPhone
        });

        // Check if phone numbers match
        if (normalizedInputPhone === normalizedStoredPhone) {
          // Extract name from multiple possible locations (same pattern as phone)
          const storedName = applicantData.name ||
                            applicantData.fountainData?.name ||
                            applicantData.fountainData?.first_name ||
                            applicantData.fountainData?.last_name ||
                            (applicantData.fountainData?.first_name && applicantData.fountainData?.last_name 
                              ? `${applicantData.fountainData.first_name} ${applicantData.fountainData.last_name}`.trim()
                              : null) ||
                            applicantData.fountainData?.applicant?.name ||
                            applicantData.fountainData?.applicant?.first_name ||
                            applicantData.fountainData?.applicant?.last_name ||
                            (applicantData.fountainData?.applicant?.first_name && applicantData.fountainData?.applicant?.last_name
                              ? `${applicantData.fountainData.applicant.first_name} ${applicantData.fountainData.applicant.last_name}`.trim()
                              : null) ||
                            applicantData.fountainData?.data?.name ||
                            applicantData.fountainData?.data?.first_name ||
                            applicantData.fountainData?.data?.last_name ||
                            (applicantData.fountainData?.data?.first_name && applicantData.fountainData?.data?.last_name
                              ? `${applicantData.fountainData.data.first_name} ${applicantData.fountainData.data.last_name}`.trim()
                              : null) ||
                            null;

          // Extract vehicle type from fountainData if available
          const vehicleType = applicantData.fountainData?.vehicle_type || 
                            applicantData.fountainData?.data?.vehicle_type ||
                            applicantData.fountainData?.vehicle ||
                            null;

          return {
            isValid: true,
            message: "Applicant verified successfully",
            applicant: {
              email: applicantData.email,
              name: storedName,
              phone: storedPhone || applicantData.phone,
              applicantId: applicantData.applicantId,
              city: applicantData.city,
              country: applicantData.country,
              funnelId: applicantData.funnelId,
              vehicleType: vehicleType,
              collectionName: collectionName,
            },
          };
        }

        // If phone doesn't match, return error
        return {
          isValid: false,
          message: "Phone number does not match our records",
        };
      }
    }

    // No applicant found in any collection
    return {
      isValid: false,
      message: "No application found with this email address",
    };
  } catch (error) {
    console.error("Error verifying applicant phone:", error);
    console.error("Error details:", error.message, error.stack);
    
    // Provide more specific error messages
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
        "internal",
        "Unable to verify applicant: " + (error.message || "Unknown error"),
    );
  }
});

/**
 * Check if Email Exists in Fountain Applicants
 * Allows unauthenticated email checking (before user logs in)
 * Returns basic info if email exists (for email verification step)
 */
exports.checkFountainEmail = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;

    // Validate inputs
    if (!email) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Email is required",
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Get all collection names to search (same as verifyApplicantPhone)
    const collectionsToSearch = [
      DEFAULT_COLLECTION,
      ...Object.values(FUNNEL_COLLECTION_MAP),
    ].filter(Boolean);
    
    // Add all fountain_applicants_* collections dynamically
    try {
      const allCollections = await db.listCollections();
      for (const collection of allCollections) {
        if (collection.id && collection.id.startsWith('fountain_applicants_') && 
            !collectionsToSearch.includes(collection.id)) {
          collectionsToSearch.push(collection.id);
        }
      }
    } catch (listError) {
      console.warn("Could not list all collections, using default:", listError.message);
    }

    // Search through all collections
    for (const collectionName of collectionsToSearch) {
      const applicantDoc = await db.collection(collectionName)
          .doc(normalizedEmail)
          .get();

      if (applicantDoc.exists) {
        const applicantData = applicantDoc.data();
        
        // Return only necessary info for email verification (no sensitive data)
        return {
          exists: true,
          phone: applicantData.phone || null,
          name: applicantData.name || null,
          applicantId: applicantData.applicantId || null,
          city: applicantData.city || null,
          country: applicantData.country || null,
          funnelId: applicantData.funnelId || null,
          collectionName: collectionName,
        };
      }
    }

    // No applicant found in any collection
    return {
      exists: false,
    };
  } catch (error) {
    console.error("Error checking Fountain email:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Unable to check email: " + error.message,
    );
  }
});

/**
 * Create Custom Token for Driver Authentication
 * Generates a custom Firebase Auth token after phone verification
 * This allows drivers to authenticate without email/password
 */
exports.createCustomToken = functions.https.onCall(async (data, context) => {
  try {
    const { email } = data;

    // Validate inputs
    if (!email) {
      throw new functions.https.HttpsError(
          "invalid-argument",
          "Email is required",
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Verify the email exists in Fountain applicants (security check)
    // This ensures only verified applicants can get tokens
    const collectionsToSearch = [
      'fountain_applicants',
      // Add dynamically discovered collections
    ];
    
    // Add all fountain_applicants_* collections dynamically
    const allCollections = await db.listCollections();
    for (const collection of allCollections) {
      if (collection.id.startsWith('fountain_applicants_') && 
          !collectionsToSearch.includes(collection.id)) {
        collectionsToSearch.push(collection.id);
      }
    }

    // Check if applicant exists in any collection
    let applicantExists = false;
    for (const collectionName of collectionsToSearch) {
      const applicantDoc = await db.collection(collectionName)
          .doc(normalizedEmail)
          .get();

      if (applicantDoc.exists) {
        applicantExists = true;
        break;
      }
    }

    if (!applicantExists) {
      throw new functions.https.HttpsError(
          "permission-denied",
          "Email not found in applicant records",
      );
    }

    // Create or get the user's UID (use email as UID for consistency)
    const uid = `driver_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;

    // Create or update the Firebase Auth user record with email
    // This ensures firebaseUser.email is available after sign-in
    try {
      let userRecord;
      try {
        // Try to get existing user
        userRecord = await admin.auth().getUser(uid);
        // Update existing user with email
        await admin.auth().updateUser(uid, {
          email: normalizedEmail,
          emailVerified: false,
        });
        console.log(`✅ Updated Firebase Auth user with email: ${normalizedEmail}`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create new user with email
          userRecord = await admin.auth().createUser({
            uid: uid,
            email: normalizedEmail,
            emailVerified: false,
          });
          console.log(`✅ Created Firebase Auth user with email: ${normalizedEmail}`);
        } else {
          throw error;
        }
      }
    } catch (authError) {
      console.warn('Warning: Could not create/update Firebase Auth user:', authError);
      // Continue anyway - custom token will still work
    }

    // Create custom token
    const customToken = await admin.auth().createCustomToken(uid, {
      email: normalizedEmail,
      role: 'driver',
    });

    console.log(`✅ Custom token created for: ${normalizedEmail}`);

    // Create or update user in Firestore using admin privileges (bypasses security rules)
    try {
      const userRef = db.collection('drivers').doc(normalizedEmail);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Create new user
        await userRef.set({
          email: normalizedEmail,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          onboardingStatus: 'started',
          isActive: true,
        });
        console.log(`✅ Created user record for: ${normalizedEmail}`);
      } else {
        // Update existing user
        await userRef.update({
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Updated user record for: ${normalizedEmail}`);
      }
    } catch (userError) {
      console.warn('Warning: Could not create/update user record:', userError);
      // Don't fail the whole operation if user creation fails
      // User can still proceed with authentication
    }

    return {
      success: true,
      customToken: customToken,
      uid: uid,
    };
  } catch (error) {
    console.error("Error creating custom token:", error);
    console.error("Error details:", error.message, error.stack);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError(
          "not-found",
          "User not found",
      );
    }
    
    // Handle specific error types
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
        "internal",
        "Unable to create custom token: " + (error.message || "Unknown error"),
    );
  }
});

/**
 * Generate Onboarding Report
 * Creates a comprehensive report when driver completes onboarding
 */
exports.generateOnboardingReport = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated",
      );
    }

    const userEmail = context.auth.token.email;

    // Get all driver data
    const [
      driverDoc,
      availabilityDoc,
      verificationDoc,
    ] = await Promise.all([
      db.collection("drivers").doc(userEmail).get(),
      db.collection("availability").doc(userEmail).get(),
      db.collection("verification").doc(userEmail).get(),
    ]);

    if (!driverDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          "Driver data not found",
      );
    }

    const driverData = driverDoc.data();
    const availabilityData = availabilityDoc.exists ? availabilityDoc.data() : null;
    const verificationData = verificationDoc.exists ? verificationDoc.data() : null;

    // Create comprehensive report
    const report = {
      reportId: `REPORT_${Date.now()}_${userEmail.replace(/[@.]/g, "_")}`,
      email: userEmail,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      generatedDate: new Date().toISOString(),

      // Personal Information
      personalInfo: {
        name: driverData.name,
        email: userEmail,
        phone: driverData.phone,
        city: driverData.city,
      },

      // Verification Details
      verificationDetails: verificationData ? {
        vehicle: verificationData.vehicle,
        licensePlate: verificationData.licensePlate,
        address: verificationData.address,
        city: verificationData.city,
        verifiedAt: verificationData.updatedAt,
      } : null,

      // Availability
      availability: availabilityData?.availability || null,

      // Acknowledgements
      acknowledgements: {
        liabilities: driverData.acknowledgedLiabilities || false,
        liabilitiesDate: driverData.liabilitiesAcknowledgedAt || null,
        cancellationPolicy: driverData.acknowledgedCancellationPolicy || false,
        cancellationPolicyDate: driverData.cancellationPolicyAcknowledgedAt || null,
        feeStructure: driverData.acknowledgedFeeStructure || false,
        feeStructureDate: driverData.feeStructureAcknowledgedAt || null,
      },

      // Health & Safety
      healthAndSafety: {
        smokingStatus: driverData.smokingStatus || null,
        hasPhysicalDifficulties: driverData.hasPhysicalDifficulties || false,
      },

      // Onboarding Status
      onboardingStatus: {
        status: driverData.onboardingStatus,
        completedAt: driverData.completedAt,
        startedAt: driverData.createdAt,
      },

      // Progress tracking
      progress: {
        personalDetails: driverData.progress_personal_details || null,
        availability: driverData.progress_availability || null,
        verification: driverData.progress_verification || null,
      },
    };

    // Store report in Firestore
    const reportRef = db.collection("reports").doc(report.reportId);
    await reportRef.set(report);

    console.log("Generated onboarding report:", report.reportId);

    return {
      success: true,
      reportId: report.reportId,
      message: "Onboarding report generated successfully",
    };
  } catch (error) {
    console.error("Error generating report:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Unable to generate report",
    );
  }
});

/**
 * Acknowledgements (Legal) - Cloud Callable Functions
 * These functions set immutable acknowledgement flags and server timestamps
 * on the driver's document. They are idempotent (do nothing if already set).
 */
exports.acknowledgeFeeStructure = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated",
      );
    }

    const userEmail = context.auth.token.email;
    const driverRef = db.collection("drivers").doc(userEmail);
    const driverDoc = await driverRef.get();

    // If already acknowledged, return existing
    if (driverDoc.exists && (driverDoc.get("acknowledgedFeeStructure") === true || driverDoc.get("feeStructureAcknowledged") === true)) {
      return { success: true, alreadyAcknowledged: true };
    }

    await driverRef.set({
      acknowledgedFeeStructure: true,
      feeStructureAcknowledged: true,
      feeStructureAcknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, alreadyAcknowledged: false };
  } catch (error) {
    console.error("Error acknowledging fee structure:", error);
    throw new functions.https.HttpsError("internal", "Unable to acknowledge fee structure");
  }
});

exports.acknowledgeLiabilities = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated",
      );
    }

    const userEmail = context.auth.token.email;
    const driverRef = db.collection("drivers").doc(userEmail);
    const driverDoc = await driverRef.get();

    if (driverDoc.exists && (driverDoc.get("acknowledgedLiabilities") === true || driverDoc.get("progress_liabilities.confirmed") === true)) {
      return { success: true, alreadyAcknowledged: true };
    }

    await driverRef.set({
      acknowledgedLiabilities: true,
      liabilitiesAcknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
      progress_liabilities: {
        confirmed: true,
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, alreadyAcknowledged: false };
  } catch (error) {
    console.error("Error acknowledging liabilities:", error);
    throw new functions.https.HttpsError("internal", "Unable to acknowledge liabilities");
  }
});

exports.acknowledgeCancellationPolicy = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated",
      );
    }

    const userEmail = context.auth.token.email;
    const driverRef = db.collection("drivers").doc(userEmail);
    const driverDoc = await driverRef.get();

    if (driverDoc.exists && (driverDoc.get("acknowledgedCancellationPolicy") === true || driverDoc.get("cancellationPolicyAcknowledged") === true)) {
      return { success: true, alreadyAcknowledged: true };
    }

    await driverRef.set({
      acknowledgedCancellationPolicy: true,
      cancellationPolicyAcknowledged: true,
      cancellationPolicyAcknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true, alreadyAcknowledged: false };
  } catch (error) {
    console.error("Error acknowledging cancellation policy:", error);
    throw new functions.https.HttpsError("internal", "Unable to acknowledge cancellation policy");
  }
});

/**
 * Get Fountain Applicant Data
 * Allows authenticated users to retrieve their Fountain application data
 */
exports.getFountainApplicant = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated",
      );
    }

    const userEmail = context.auth.token.email;

    // Get applicant data
    const applicantDoc = await db.collection("fountain_applicants")
        .doc(userEmail)
        .get();

    if (!applicantDoc.exists) {
      return {
        found: false,
        message: "No Fountain application found",
      };
    }

    const applicantData = applicantDoc.data();

    // Return sanitized data (don't expose full webhook payload)
    return {
      found: true,
      applicant: {
        email: applicantData.email,
        phone: applicantData.phone,
        name: applicantData.name,
        applicantId: applicantData.applicantId,
        stage: applicantData.stage,
        status: applicantData.status,
        city: applicantData.city,
      },
    };
  } catch (error) {
    console.error("Error getting Fountain applicant:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Unable to retrieve applicant data",
    );
  }
});

