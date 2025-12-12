const { onCall } = require("firebase-functions/v2/https");
const { db } = require("../utils/firebase-init");
const { logger } = require("firebase-functions");

/**
 * Initialize the first super admin
 * This function can only be called once - it will fail if a super admin already exists
 */
exports.initializeSuperAdmin = onCall(async (request) => {
  try {
    const { email = "hari@laundryheap.com", name = "Hari" } = request.data || {};
    
    if (!email || typeof email !== "string") {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error("Invalid email format");
    }

    // Check if any admins exist
    const adminsRef = db.collection("admins");
    const adminsSnapshot = await adminsRef.get();

    if (!adminsSnapshot.empty) {
      // Check if super_admin already exists
      const superAdminExists = adminsSnapshot.docs.some(
        (doc) => doc.data().role === "super_admin"
      );
      
      if (superAdminExists) {
        throw new Error("A super admin already exists. Cannot initialize another one.");
      }
    }

    // Create the first super admin
    const adminRef = adminsRef.doc(normalizedEmail);
    await adminRef.set({
      email: normalizedEmail,
      name: name || normalizedEmail.split("@")[0],
      role: "super_admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Super admin ${normalizedEmail} initialized successfully`);

    return {
      success: true,
      message: `Super admin ${normalizedEmail} created successfully`,
      admin: {
        email: normalizedEmail,
        name: name || normalizedEmail.split("@")[0],
        role: "super_admin",
      },
    };
  } catch (error) {
    logger.error("Error initializing super admin:", error);
    throw new Error(error.message || "Failed to initialize super admin");
  }
});

