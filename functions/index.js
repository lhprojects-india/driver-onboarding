// Initialize Firebase Admin first (required for all functions)
require("./utils/firebase-init");

// Import and re-export all functions
// Webhooks
const fountainWebhook = require("./webhooks/fountain-webhook");

// Auth
const createCustomToken = require("./auth/create-custom-token");

// Applicants
const verifyApplicantPhone = require("./applicants/verify-phone");
const checkFountainEmail = require("./applicants/check-email");
const getFountainApplicant = require("./applicants/get-applicant");

// Acknowledgements
const acknowledgeFeeStructure = require("./acknowledgements/fee-structure");
const acknowledgeLiabilities = require("./acknowledgements/liabilities");
const acknowledgeCancellationPolicy = require("./acknowledgements/cancellation-policy");

// Reports
const generateOnboardingReport = require("./reports/onboarding-report");

// Utils
const listCollections = require("./utils/list-collections-function");
const initializeCollections = require("./utils/initialize-collections-function");

// Admin
const initializeSuperAdmin = require("./admin/initialize-super-admin");

// Export all functions
exports.fountainWebhook = fountainWebhook.fountainWebhook;
exports.verifyApplicantPhone = verifyApplicantPhone.verifyApplicantPhone;
exports.checkFountainEmail = checkFountainEmail.checkFountainEmail;
exports.createCustomToken = createCustomToken.createCustomToken;
exports.generateOnboardingReport = generateOnboardingReport.generateOnboardingReport;
exports.acknowledgeFeeStructure = acknowledgeFeeStructure.acknowledgeFeeStructure;
exports.acknowledgeLiabilities = acknowledgeLiabilities.acknowledgeLiabilities;
exports.acknowledgeCancellationPolicy = acknowledgeCancellationPolicy.acknowledgeCancellationPolicy;
exports.getFountainApplicant = getFountainApplicant.getFountainApplicant;
exports.listCollections = listCollections.listCollections;
exports.initializeCollections = initializeCollections.initializeCollections;
exports.cleanupPlaceholders = initializeCollections.cleanupPlaceholders;
exports.initializeSuperAdmin = initializeSuperAdmin.initializeSuperAdmin;
