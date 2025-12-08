const functions = require("firebase-functions");
const { db } = require("../utils/firebase-init");
const { DEFAULT_COLLECTION } = require("../utils/config");

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

    // Search in single fountain_applicants collection
    const applicantDoc = await db.collection(DEFAULT_COLLECTION)
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
      };
    }

    // No applicant found
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

