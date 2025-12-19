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

    // Helper function to extract vehicle type from fountain data
    const getVehicleTypeFromMOT = (fountainData) => {
      if (!fountainData) {
        return "car";
      }

      // Try multiple paths for MOT data (webhook structure can vary)
      let mot = null;
      const pathsToCheck = [
        () => fountainData.data?.mot,
        () => fountainData.mot,
        () => fountainData.applicant?.data?.mot,
        () => fountainData.data?.vehicle_type,
        () => fountainData.vehicle_type,
        () => fountainData.vehicle,
        () => fountainData.applicant?.data?.vehicle_type,
      ];

      for (const getPath of pathsToCheck) {
        try {
          const value = getPath();
          if (value) {
            mot = String(value).toLowerCase().trim();
            break;
          }
        } catch (e) {
          // Continue to next path if this one fails
        }
      }

      // If we found MOT or vehicle data, process it
      if (mot) {
        // Van category - check for "van" (case-insensitive)
        if (mot.includes("van")) {
          return "van";
        }

        // Car categories: SUV, 7 seater (with variations), Hatchback, Sedan, Saloon, Estate
        const carTypes = [
          "suv",
          "7 seater", "7-seater", "7seater",
          "hatchback",
          "sedan",
          "saloon",
          "estate"
        ];

        for (const carType of carTypes) {
          // Remove spaces and dashes for comparison to handle variations
          const normalizedMot = mot.replace(/[\s-]/g, "");
          const normalizedCarType = carType.replace(/[\s-]/g, "");
          if (normalizedMot.includes(normalizedCarType)) {
            return "car";
          }
        }

        // If mot contains vehicle info but doesn't match specific types, default to car
        return "car";
      }

      // Default to "car" if MOT data is not available
      return "car";
    };

    // Get all driver data
    const [
      driverDoc,
      availabilityDoc,
      verificationDoc,
      fountainDoc,
    ] = await Promise.all([
      db.collection("drivers").doc(userEmail).get(),
      db.collection("availability").doc(userEmail).get(),
      db.collection("verification").doc(userEmail).get(),
      db.collection("fountain_applicants").doc(userEmail).get(),
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
    const fountainData = fountainDoc.exists ? fountainDoc.data() : null;

    // Extract vehicle type from fountain data
    const vehicleTypeFromFountain = fountainData?.fountainData 
      ? getVehicleTypeFromMOT(fountainData.fountainData) 
      : null;

    // Helper function to order availability days (Monday to Sunday)
    const orderAvailabilityDays = (availability) => {
      if (!availability) {
        return null;
      }

      const DAYS_ORDER = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];
      const orderedAvailability = {};

      // Create a new object with days in the correct order
      for (const day of DAYS_ORDER) {
        if (availability[day]) {
          orderedAvailability[day] = availability[day];
        }
      }

      // Include any additional days that might not be in the standard order
      for (const day in availability) {
        if (!orderedAvailability[day] && availability.hasOwnProperty(day)) {
          orderedAvailability[day] = availability[day];
        }
      }

      return orderedAvailability;
    };

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

      // Driver Information (includes vehicle type from fountain data)
      driverInfo: {
        name: driverData.name,
        email: userEmail,
        phone: driverData.phone,
        city: driverData.city,
        vehicleType: vehicleTypeFromFountain || driverData.vehicleType || null,
        country: driverData.country || null,
      },

      // Verification Details
      verificationDetails: verificationData ? {
        vehicle: verificationData.vehicle,
        licensePlate: verificationData.licensePlate,
        address: verificationData.address,
        city: verificationData.city,
        verifiedAt: verificationData.updatedAt,
      } : null,

      // Availability (ordered Monday to Sunday)
      availability: orderAvailabilityDays(availabilityData?.availability),

      // Acknowledgements
      // Check multiple field name variations to ensure we catch all acknowledgements
      acknowledgements: {
        // Role
        role: (
          driverData.roleUnderstood === true ||
          driverData.roleAcknowledged === true ||
          driverData?.progress_role?.confirmed === true
        ) || false,
        roleDate: (
          driverData.roleUnderstoodAt ||
          driverData.roleAcknowledgedAt ||
          driverData?.progress_role?.confirmedAt ||
          null
        ),
        // Block Classification
        blockClassification: (
          driverData.blocksClassificationAcknowledged === true
        ) || false,
        blockClassificationDate: (
          driverData.blocksClassificationAcknowledgedAt || null
        ),
        // Fee structure
        feeStructure: (
          driverData.acknowledgedFeeStructure === true ||
          driverData.feeStructureAcknowledged === true
        ) || false,
        feeStructureDate: (
          driverData.feeStructureAcknowledgedAt || null
        ),
        // Payment Cycle & Schedule
        paymentCycleSchedule: (
          driverData.acknowledgedPaymentCycleSchedule === true ||
          driverData.paymentCycleScheduleAcknowledged === true
        ) || false,
        paymentCycleScheduleDate: (
          driverData.paymentCycleScheduleAcknowledgedAt || null
        ),
        // Routes Policy
        routesPolicy: (
          driverData.routesPolicyAcknowledged === true
        ) || false,
        routesPolicyDate: (
          driverData.routesPolicyAcknowledgedAt || null
        ),
        // Cancellation policy
        cancellationPolicy: (
          driverData.acknowledgedCancellationPolicy === true ||
          driverData.cancellationPolicyAcknowledged === true
        ) || false,
        cancellationPolicyDate: (
          driverData.cancellationPolicyAcknowledgedAt || null
        ),
        // Liabilities
        liabilities: (
          driverData.acknowledgedLiabilities === true ||
          driverData?.progress_liabilities?.confirmed === true
        ) || false,
        liabilitiesDate: (
          driverData.liabilitiesAcknowledgedAt ||
          driverData?.progress_liabilities?.confirmedAt ||
          null
        ),
      },

      // Health & Safety
      healthAndSafety: {
        smokingStatus: driverData.smokingStatus || null,
        hasPhysicalDifficulties: driverData.hasPhysicalDifficulties !== undefined ? driverData.hasPhysicalDifficulties : null,
        smokingFitnessCompleted: driverData.progress_smoking_fitness_check?.confirmed === true,
      },

      // Facility Preferences
      facilityPreferences: {
        selectedFacilities: driverData.selectedFacilities || [],
        acknowledged: driverData.facilityLocationsAcknowledged || false,
        acknowledgedAt: driverData.facilityLocationsAcknowledgedAt || null,
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

