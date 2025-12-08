const functions = require("firebase-functions");
const { db } = require("../utils/firebase-init");
const { DEFAULT_COLLECTION } = require("../utils/config");

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

    // Search in single fountain_applicants collection
    const applicantDoc = await db.collection(DEFAULT_COLLECTION)
        .doc(normalizedEmail)
        .get();

    if (!applicantDoc.exists) {
      // No applicant found
      return {
        isValid: false,
        message: "No application found with this email address",
      };
    }

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

      // Include full fountainData in response so MOT data is available
      // This ensures data.mot is accessible for vehicle-specific fee structures
      const applicantResponse = {
        email: applicantData.email,
        name: storedName,
        phone: storedPhone || applicantData.phone,
        applicantId: applicantData.applicantId,
        city: applicantData.city,
        country: applicantData.country,
        funnelId: applicantData.funnelId,
        vehicleType: vehicleType,
      };

      // Merge full fountainData if available (includes data.mot and other webhook data)
      if (applicantData.fountainData) {
        applicantResponse.fountainData = applicantData.fountainData;
      }

      return {
        isValid: true,
        message: "Applicant verified successfully",
        applicant: applicantResponse,
      };
    }

    // If phone doesn't match, return error
    return {
      isValid: false,
      message: "Phone number does not match our records",
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

