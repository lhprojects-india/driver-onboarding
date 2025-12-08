const functions = require("firebase-functions");
const { admin, db } = require("../utils/firebase-init");

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

