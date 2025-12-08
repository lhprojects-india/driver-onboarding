const functions = require("firebase-functions");
const { db } = require("../utils/firebase-init");

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

