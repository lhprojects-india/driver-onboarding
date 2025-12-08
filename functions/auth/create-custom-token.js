const functions = require("firebase-functions");
const { admin, db } = require("../utils/firebase-init");
const { DEFAULT_COLLECTION } = require("../utils/config");

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
    const applicantDoc = await db.collection(DEFAULT_COLLECTION)
        .doc(normalizedEmail)
        .get();

    if (!applicantDoc.exists) {
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

