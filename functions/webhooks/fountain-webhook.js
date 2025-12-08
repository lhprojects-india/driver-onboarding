const functions = require("firebase-functions");
const cors = require("cors")({origin: true});
const { admin, db } = require("../utils/firebase-init");
const { DEFAULT_COLLECTION } = require("../utils/config");

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
        
      // Extract city with priority: address_detail.city > city > name
      const locationCity = webhookData.applicant?.funnel?.location?.address_detail?.city ||
        webhookData.funnel?.location?.address_detail?.city ||
        webhookData.applicant?.funnel?.location?.city ||
        webhookData.funnel?.location?.city ||
        webhookData.applicant?.funnel?.location?.name ||
        webhookData.funnel?.location?.name ||
        webhookData.location?.city ||
        data?.location?.city || 
        city || 
        null;
        
      const locationCountry = webhookData.applicant?.funnel?.location?.address_detail?.country_code ||
        webhookData.funnel?.location?.address_detail?.country_code ||
        webhookData.applicant?.funnel?.location?.country_code ||
        webhookData.funnel?.location?.country_code ||
        webhookData.location?.country_code ||
        data?.location?.country_code || 
        null;

      // Use single collection for all webhook data
      const collectionName = DEFAULT_COLLECTION;

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
        fountainData: webhookData, // Store complete webhook payload
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        webhookReceivedAt: new Date().toISOString(),
        isActive: true,
      };

      // Store in the single fountain_applicants collection
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

