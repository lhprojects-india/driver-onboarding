const functions = require("firebase-functions");
const { admin, db } = require("../utils/firebase-init");

/**
 * Acknowledgements (Legal) - Cloud Callable Functions
 * These functions set immutable acknowledgement flags and server timestamps
 * on the driver's document. They are idempotent (do nothing if already set).
 */
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

