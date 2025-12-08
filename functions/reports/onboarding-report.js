const functions = require("firebase-functions");
const { admin, db } = require("../utils/firebase-init");

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

