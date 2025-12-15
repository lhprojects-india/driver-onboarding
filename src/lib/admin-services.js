import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { getVehicleTypeFromMOT } from './utils';

// Collection names
const COLLECTIONS = {
  DRIVERS: 'drivers',
  FOUNTAIN_APPLICANTS: 'fountain_applicants',
  ONBOARDING: 'onboarding',
  AVAILABILITY: 'availability',
  VERIFICATION: 'verification',
  REPORTS: 'reports',
  FEE_STRUCTURES: 'fee_structures',
  FACILITIES: 'facilities',
  AUTHORIZED_EMAILS: 'authorized_emails',
  ADMINS: 'admins'
};

// Admin Services
export const adminServices = {
  // Get all applications (show all fountain_applicants)
  async getAllApplications() {
    try {
      // Query fountain_applicants collection (source of truth)
      const fountainApplicantsRef = collection(db, COLLECTIONS.FOUNTAIN_APPLICANTS);
      const fountainQuerySnapshot = await getDocs(fountainApplicantsRef);
      const applications = [];

      for (const fountainDoc of fountainQuerySnapshot.docs) {
        const fountainData = fountainDoc.data();
        const normalizedEmail = fountainDoc.id; // Already lowercase in fountain_applicants
        
        // Try to get driver data if it exists (optional - for onboarding progress)
        // Try both normalized and original email format in drivers (in case of case mismatch)
        const driverRef = doc(db, COLLECTIONS.DRIVERS, normalizedEmail);
        let driverDoc = null;
        let driverData = {};
        let driverEmail = normalizedEmail;
        
        try {
          driverDoc = await getDoc(driverRef);
          
          // If not found with normalized email, try with the email from fountain data
          if (!driverDoc.exists() && fountainData.email && fountainData.email !== normalizedEmail) {
            const driverRefOriginal = doc(db, COLLECTIONS.DRIVERS, fountainData.email);
            const driverDocOriginal = await getDoc(driverRefOriginal);
            if (driverDocOriginal.exists()) {
              driverDoc = driverDocOriginal;
              driverEmail = fountainData.email;
            }
          }
          
          if (driverDoc?.exists()) {
            driverData = driverDoc.data();
            driverEmail = driverDoc.id; // Use the actual document ID from drivers
          }
        } catch (error) {
          // Continue even if driver data check fails
        }

        // Get additional data from other collections (use driverEmail if available, otherwise normalizedEmail)
        const emailToUse = driverEmail || normalizedEmail;
        const [availabilityData, verificationData, reportData] = await Promise.all([
          this.getAvailabilityData(emailToUse),
          this.getVerificationData(emailToUse),
          this.getReportByEmail(emailToUse)
        ]);

        // Merge fountain_applicants data with optional drivers data
        applications.push({
          id: normalizedEmail,
          email: normalizedEmail,
          // Fountain data (primary source)
          ...fountainData,
          // Driver data (onboarding progress, status, etc.) - only if exists
          ...driverData,
          // Ensure email is set correctly
          email: normalizedEmail,
          // Additional collections data
          availability: availabilityData,
          verification: verificationData,
          report: reportData,
          // Use fountain createdAt if available, otherwise driver createdAt
          createdAt: fountainData.createdAt?.toDate?.() || driverData.createdAt?.toDate?.() || new Date(),
          updatedAt: driverData.updatedAt?.toDate?.() || fountainData.updatedAt?.toDate?.() || new Date(),
        });
      }

      // Sort by creation date (newest first) - using fountain_applicants creation date
      return applications.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error getting all applications:', error);
      return [];
    }
  },

  // Debug helper: Check if a specific email exists in both collections (prioritizing fountain_applicants)
  async checkEmailInBothCollections(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check fountain_applicants first (prioritized)
      const fountainDoc = await getDoc(doc(db, COLLECTIONS.FOUNTAIN_APPLICANTS, normalizedEmail));
      
      // Check drivers with both normalized and original email
      const driverDocNormalized = await getDoc(doc(db, COLLECTIONS.DRIVERS, normalizedEmail));
      const driverDocOriginal = email !== normalizedEmail 
        ? await getDoc(doc(db, COLLECTIONS.DRIVERS, email))
        : null;

      const driverDoc = driverDocNormalized.exists() ? driverDocNormalized : driverDocOriginal;
      const inDrivers = driverDocNormalized.exists() || (driverDocOriginal?.exists() ?? false);

      return {
        email,
        normalizedEmail,
        inFountainApplicants: fountainDoc.exists(),
        inDrivers,
        inBoth: fountainDoc.exists() && inDrivers,
        fountainDocId: fountainDoc.exists() ? normalizedEmail : null,
        driverDocId: driverDocNormalized.exists() ? normalizedEmail : (driverDocOriginal?.exists() ? email : null),
        fountainData: fountainDoc.exists() ? fountainDoc.data() : null,
        driverData: driverDoc?.exists() ? driverDoc.data() : null
      };
    } catch (error) {
      console.error('Error checking email in collections:', error);
      return {
        email,
        error: error.message
      };
    }
  },

  // Get availability data for a driver
  async getAvailabilityData(email) {
    try {
      const availabilityRef = doc(db, COLLECTIONS.AVAILABILITY, email);
      const availabilityDoc = await getDoc(availabilityRef);
      
      if (availabilityDoc.exists()) {
        return availabilityDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting availability data:', error);
      return null;
    }
  },

  // Get verification data for a driver
  async getVerificationData(email) {
    try {
      const verificationRef = doc(db, COLLECTIONS.VERIFICATION, email);
      const verificationDoc = await getDoc(verificationRef);
      
      if (verificationDoc.exists()) {
        return verificationDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting verification data:', error);
      return null;
    }
  },

  // Get report by email (driver email)
  async getReportByEmail(email) {
    try {
      const reportsRef = collection(db, COLLECTIONS.REPORTS);
      const q = query(reportsRef, where('driverEmail', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Get the most recent report
        const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return reports.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        })[0];
      }
      return null;
    } catch (error) {
      console.error('Error getting report by email:', error);
      return null;
    }
  },

  // Get report by reportId
  async getReportByReportId(reportId) {
    try {
      const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);
      const reportDoc = await getDoc(reportRef);
      
      if (reportDoc.exists()) {
        return { id: reportDoc.id, ...reportDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting report by reportId:', error);
      return null;
    }
  },

  // Get all reports
  async getAllReports() {
    try {
      const reportsRef = collection(db, COLLECTIONS.REPORTS);
      const querySnapshot = await getDocs(reportsRef);
      const reports = [];

      querySnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Sort by creation date (newest first)
      return reports.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error getting all reports:', error);
      return [];
    }
  },

  // Create mock report for testing
  async createMockReport(email, driverData) {
    try {
      const reportId = `REPORT_${Date.now()}_${email.replace(/[@.]/g, "_")}`;
      
      // Fetch latest driver record from Firestore so acknowledgements/progress are accurate
      const driverRef = doc(db, COLLECTIONS.DRIVERS, email);
      const driverSnap = await getDoc(driverRef);
      const driverRecord = driverSnap.exists() ? driverSnap.data() : (driverData || {});
      
      // Fetch fountain data to get vehicle type from MOT
      const fountainRef = doc(db, COLLECTIONS.FOUNTAIN_APPLICANTS, email);
      const fountainSnap = await getDoc(fountainRef);
      const fountainData = fountainSnap.exists() ? fountainSnap.data() : null;
      
      // Extract vehicle type from fountain data using MOT
      const vehicleTypeFromFountain = fountainData?.fountainData 
        ? getVehicleTypeFromMOT(fountainData.fountainData) 
        : null;

      // Get additional data
      const [availabilityData, verificationData] = await Promise.all([
        this.getAvailabilityData(email),
        this.getVerificationData(email)
      ]);

      // Create comprehensive report matching Cloud Function structure
      const report = {
        reportId: reportId,
        email: email,
        driverEmail: email, // Add both for compatibility
        generatedAt: serverTimestamp(),
        generatedDate: new Date().toISOString(),
        createdAt: serverTimestamp(),

        // Personal Information
        personalInfo: {
          name: driverRecord.name || driverData?.name || null,
          email: email,
          phone: driverRecord.phone || driverData?.phone || null,
          city: driverRecord.city || driverData?.city || null,
        },
        driverInfo: {
          name: driverRecord.name || driverData?.name || null,
          email: email,
          phone: driverRecord.phone || driverData?.phone || null,
          city: driverRecord.city || driverData?.city || null,
          vehicleType: vehicleTypeFromFountain || driverRecord.vehicleType || driverData?.vehicleType || null,
          country: driverRecord.country || driverData?.country || null,
        },

        // Verification Details
        verificationDetails: verificationData ? {
          vehicle: verificationData.vehicle || null,
          licensePlate: verificationData.licensePlate || null,
          address: verificationData.address || null,
          city: verificationData.city || null,
          verifiedAt: verificationData.updatedAt || null,
        } : null,
        verification: verificationData || null,

        // Availability
        availability: availabilityData?.availability || null,

        // Acknowledgements (support multiple field names used in the app)
        // Check all possible field name variations to ensure we catch all acknowledgements
        acknowledgements: {
          // Role
          role: !!(
            driverRecord.roleUnderstood ||
            driverRecord.roleAcknowledged ||
            driverRecord?.progress_role?.confirmed ||
            driverData?.roleUnderstood ||
            driverData?.roleAcknowledged ||
            driverData?.progress_role?.confirmed
          ),
          roleDate: (
            driverRecord.roleUnderstoodAt ||
            driverRecord.roleAcknowledgedAt ||
            driverRecord?.progress_role?.confirmedAt ||
            driverData?.roleUnderstoodAt ||
            driverData?.roleAcknowledgedAt ||
            driverData?.progress_role?.confirmedAt ||
            null
          ),
          // Block Classification
          blockClassification: !!(
            driverRecord.blocksClassificationAcknowledged ||
            driverData?.blocksClassificationAcknowledged
          ),
          blockClassificationDate: (
            driverRecord.blocksClassificationAcknowledgedAt ||
            driverData?.blocksClassificationAcknowledgedAt || null
          ),
          // Fee structure
          feeStructure: !!(
            driverRecord.acknowledgedFeeStructure ||
            driverRecord.feeStructureAcknowledged ||
            driverData?.acknowledgedFeeStructure ||
            driverData?.feeStructureAcknowledged
          ),
          feeStructureDate: (
            driverRecord.feeStructureAcknowledgedAt ||
            driverData?.feeStructureAcknowledgedAt || null
          ),
          // Routes Policy
          routesPolicy: !!(
            driverRecord.routesPolicyAcknowledged ||
            driverData?.routesPolicyAcknowledged
          ),
          routesPolicyDate: (
            driverRecord.routesPolicyAcknowledgedAt ||
            driverData?.routesPolicyAcknowledgedAt || null
          ),
          // Cancellation policy
          cancellationPolicy: !!(
            driverRecord.acknowledgedCancellationPolicy ||
            driverRecord.cancellationPolicyAcknowledged ||
            driverData?.acknowledgedCancellationPolicy ||
            driverData?.cancellationPolicyAcknowledged
          ),
          cancellationPolicyDate: (
            driverRecord.cancellationPolicyAcknowledgedAt ||
            driverData?.cancellationPolicyAcknowledgedAt || null
          ),
          // Liabilities
          liabilities: !!(
            driverRecord.acknowledgedLiabilities ||
            driverRecord?.progress_liabilities?.confirmed ||
            driverData?.acknowledgedLiabilities ||
            driverData?.progress_liabilities?.confirmed
          ),
          liabilitiesDate: (
            driverRecord.liabilitiesAcknowledgedAt ||
            driverRecord?.progress_liabilities?.confirmedAt ||
            driverData?.liabilitiesAcknowledgedAt ||
            driverData?.progress_liabilities?.confirmedAt ||
            null
          ),
        },

        // Health & Safety
        healthAndSafety: {
          smokingStatus: driverRecord.smokingStatus || driverData?.smokingStatus || null,
          hasPhysicalDifficulties: (driverRecord.hasPhysicalDifficulties !== undefined ? driverRecord.hasPhysicalDifficulties : (driverData?.hasPhysicalDifficulties !== undefined ? driverData.hasPhysicalDifficulties : null)),
          smokingFitnessCompleted: driverRecord.progress_smoking_fitness_check?.confirmed === true || driverData?.progress_smoking_fitness_check?.confirmed === true,
        },

        // Facility Preferences
        facilityPreferences: {
          selectedFacilities: driverRecord.selectedFacilities || driverData?.selectedFacilities || [],
          acknowledged: driverRecord.facilityLocationsAcknowledged || driverData?.facilityLocationsAcknowledged || false,
          acknowledgedAt: driverRecord.facilityLocationsAcknowledgedAt || driverData?.facilityLocationsAcknowledgedAt || null,
        },

        // Onboarding Status
        onboardingStatus: driverRecord.onboardingStatus || driverData?.onboardingStatus || 'completed',
        onboardingStatusDetails: {
          status: driverRecord.onboardingStatus || driverData?.onboardingStatus || 'completed',
          completedAt: driverRecord.completedAt || driverData?.completedAt || serverTimestamp(),
          startedAt: driverRecord.createdAt || driverData?.createdAt || serverTimestamp(),
        },

        // Progress tracking
        progress: {
          personalDetails: driverRecord.progress_personal_details || driverData?.progress_personal_details || null,
          availability: driverRecord.progress_availability || driverData?.progress_availability || null,
          verification: driverRecord.progress_verification || driverData?.progress_verification || null,
        },
      };

      // Store report in Firestore
      const reportRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await setDoc(reportRef, report);

      return reportId;
    } catch (error) {
      console.error('Error creating mock report:', error);
      return null;
    }
  },

  // Update application status
  async updateApplicationStatus(email, status, adminNotes = '') {
    try {
      const driverRef = doc(db, COLLECTIONS.DRIVERS, email);
      await updateDoc(driverRef, {
        status: status,
        adminNotes: adminNotes,
        statusUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error updating application status:', error);
      return false;
    }
  },

  // Reset driver's onboarding progress (allows them to start over)
  async resetDriverProgress(email) {
    try {
      // Update driver document - reset status but keep personal info and Fountain data
      const driverRef = doc(db, COLLECTIONS.DRIVERS, email);
      const driverDoc = await getDoc(driverRef);
      
      if (!driverDoc.exists()) {
        return { success: false, message: 'Driver not found' };
      }
      
      const currentData = driverDoc.data();
      
      // Keep essential data but reset onboarding status and progress fields
      await updateDoc(driverRef, {
        onboardingStatus: 'started',
        completedAt: null,
        reportId: null,
        // Clear progress tracking fields
        progress_verify: null,
        progress_confirm_details: null,
        progress_introduction: null,
        progress_role: null,
        progress_fleet_agent: null,
        progress_availability: null,
        progress_verification: null,
        progress_blocks_classification: null,
        progress_routes_policy: null,
        progress_fee_structure: null,
        progress_liabilities: null,
        progress_cancellation_policy: null,
        progress_smoking_fitness_check: null,
        progress_about: null,
        progress_acknowledgements: null,
        progress_facility_locations: null,
        // Clear acknowledgement flags
        acknowledgedFeeStructure: null,
        feeStructureAcknowledged: null,
        feeStructureAcknowledgedAt: null,
        acknowledgedLiabilities: null,
        liabilitiesAcknowledgedAt: null,
        acknowledgedCancellationPolicy: null,
        cancellationPolicyAcknowledged: null,
        cancellationPolicyAcknowledgedAt: null,
        blocksClassificationAcknowledged: null,
        blocksClassificationAcknowledgedAt: null,
        routesPolicyAcknowledged: null,
        routesPolicyAcknowledgedAt: null,
        roleAcknowledged: null,
        roleAcknowledgedAt: null,
        aboutAcknowledged: null,
        aboutAcknowledgedAt: null,
        introductionAcknowledged: null,
        introductionAcknowledgedAt: null,
        facilityLocationsAcknowledged: null,
        facilityLocationsAcknowledgedAt: null,
        // Clear health and safety
        smokingStatus: null,
        hasPhysicalDifficulties: null,
        // Clear details confirmation
        detailsConfirmed: null,
        detailsConfirmedAt: null,
        // Clear last route tracking
        lastRoute: null,
        lastRouteUpdatedAt: null,
        // Update timestamp
        updatedAt: serverTimestamp(),
        resetAt: serverTimestamp(),
        resetBy: 'admin',
      });
      
      // Optional: Clear availability and verification data
      // Uncomment if you want to also clear these
      /*
      const availabilityRef = doc(db, COLLECTIONS.AVAILABILITY, email);
      const verificationRef = doc(db, COLLECTIONS.VERIFICATION, email);
      await Promise.all([
        deleteDoc(availabilityRef),
        deleteDoc(verificationRef)
      ]);
      */
      
      return { success: true, message: 'Driver progress reset successfully' };
    } catch (error) {
      console.error('Error resetting driver progress:', error);
      return { success: false, message: error.message };
    }
  },

  // Delete application and all related data
  async deleteApplication(email) {
    try {
      // Delete from all collections
      const collections = [COLLECTIONS.DRIVERS, COLLECTIONS.AVAILABILITY, COLLECTIONS.VERIFICATION];
      
      for (const collectionName of collections) {
        const docRef = doc(db, collectionName, email);
        await deleteDoc(docRef);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting application:', error);
      return false;
    }
  },

  // Get all fee structures
  async getAllFeeStructures() {
    try {
      const feeStructuresRef = collection(db, COLLECTIONS.FEE_STRUCTURES);
      const querySnapshot = await getDocs(feeStructuresRef);
      const feeStructures = {};

      querySnapshot.forEach((doc) => {
        feeStructures[doc.id] = {
          id: doc.id,
          ...doc.data()
        };
      });

      return feeStructures;
    } catch (error) {
      console.error('Error getting all fee structures:', error);
      return {};
    }
  },

  // Create or update fee structure
  async setFeeStructure(city, feeStructureData) {
    try {
      const normalizedCity = city.toLowerCase().trim();
      const feeStructureRef = doc(db, COLLECTIONS.FEE_STRUCTURES, normalizedCity);
      
      await setDoc(feeStructureRef, {
        city: city,
        ...feeStructureData,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error setting fee structure:', error);
      return false;
    }
  },

  // Delete fee structure
  async deleteFeeStructure(city) {
    try {
      const normalizedCity = city.toLowerCase().trim();
      const feeStructureRef = doc(db, COLLECTIONS.FEE_STRUCTURES, normalizedCity);
      await deleteDoc(feeStructureRef);
      return true;
    } catch (error) {
      console.error('Error deleting fee structure:', error);
      return false;
    }
  },

  // Get authorized emails
  async getAuthorizedEmails() {
    try {
      const authorizedEmailsRef = collection(db, COLLECTIONS.AUTHORIZED_EMAILS);
      const querySnapshot = await getDocs(authorizedEmailsRef);
      const emails = [];

      querySnapshot.forEach((doc) => {
        emails.push({
          email: doc.id,
          ...doc.data()
        });
      });

      return emails;
    } catch (error) {
      console.error('Error getting authorized emails:', error);
      return [];
    }
  },

  // Add authorized email
  async addAuthorizedEmail(email, emailData = {}) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const emailRef = doc(db, COLLECTIONS.AUTHORIZED_EMAILS, normalizedEmail);
      await setDoc(emailRef, {
        email: normalizedEmail,
        createdAt: emailData.createdAt || serverTimestamp(),
        addedAt: serverTimestamp(),
        ...emailData
      });
      return true;
    } catch (error) {
      console.error('Error adding authorized email:', error);
      return false;
    }
  },

  // Remove authorized email
  async removeAuthorizedEmail(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const emailRef = doc(db, COLLECTIONS.AUTHORIZED_EMAILS, normalizedEmail);
      await deleteDoc(emailRef);
      return true;
    } catch (error) {
      console.error('Error removing authorized email:', error);
      return false;
    }
  },

  // Get application statistics
  async getApplicationStats() {
    try {
      const applications = await this.getAllApplications();
      
      const stats = {
        total: applications.length,
        pending: applications.filter(app => !app.status || app.status === 'pending').length,
        approved: applications.filter(app => app.status === 'approved').length,
        rejected: applications.filter(app => app.status === 'rejected').length,
        completed: applications.filter(app => app.onboardingStatus === 'completed').length,
        inProgress: applications.filter(app => app.onboardingStatus === 'started').length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting application stats:', error);
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        completed: 0,
        inProgress: 0,
      };
    }
  },

  // Facility Management Services
  // Get all facilities
  async getAllFacilities() {
    try {
      const facilitiesRef = collection(db, COLLECTIONS.FACILITIES);
      const querySnapshot = await getDocs(facilitiesRef);
      const facilities = [];

      querySnapshot.forEach((doc) => {
        facilities.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // Group by city for easier management
      const facilitiesByCity = {};
      facilities.forEach(facility => {
        const city = facility.city || facility.City;
        if (!facilitiesByCity[city]) {
          facilitiesByCity[city] = [];
        }
        facilitiesByCity[city].push(facility);
      });

      return facilitiesByCity;
    } catch (error) {
      console.error('Error getting all facilities:', error);
      return {};
    }
  },

  // Create or update facility
  async setFacility(facilityData) {
    try {
      // Use facility code as document ID for easy lookup
      const facilityCode = facilityData.facility || facilityData.Facility;
      if (!facilityCode) {
        throw new Error('Facility code is required');
      }

      const facilityRef = doc(db, COLLECTIONS.FACILITIES, facilityCode);
      
      await setDoc(facilityRef, {
        city: facilityData.city || facilityData.City,
        facility: facilityCode,
        address: facilityData.address || facilityData.Address,
        createdAt: facilityData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error setting facility:', error);
      return false;
    }
  },

  // Delete facility
  async deleteFacility(facilityCode) {
    try {
      const facilityRef = doc(db, COLLECTIONS.FACILITIES, facilityCode);
      await deleteDoc(facilityRef);
      return true;
    } catch (error) {
      console.error('Error deleting facility:', error);
      return false;
    }
  },

  // List all collections in the database
  async listCollections() {
    try {
      const listCollectionsFn = httpsCallable(functions, 'listCollections');
      const result = await listCollectionsFn();
      return result.data;
    } catch (error) {
      console.error('Error listing collections:', error);
      throw error;
    }
  },

  // Initialize required collections
  async initializeCollections() {
    try {
      const initializeCollectionsFn = httpsCallable(functions, 'initializeCollections');
      const result = await initializeCollectionsFn();
      return result.data;
    } catch (error) {
      console.error('Error initializing collections:', error);
      throw error;
    }
  },

  // Clean up placeholder documents
  async cleanupPlaceholders() {
    try {
      const cleanupPlaceholdersFn = httpsCallable(functions, 'cleanupPlaceholders');
      const result = await cleanupPlaceholdersFn();
      return result.data;
    } catch (error) {
      console.error('Error cleaning up placeholders:', error);
      throw error;
    }
  },

  // Admin Management Services
  // Get all admins
  async getAllAdmins() {
    try {
      const adminsRef = collection(db, COLLECTIONS.ADMINS);
      const querySnapshot = await getDocs(adminsRef);
      const admins = [];

      querySnapshot.forEach((doc) => {
        admins.push({
          id: doc.id,
          email: doc.id,
          ...doc.data()
        });
      });

      // Sort by role (super_admin first, then app_admin, then admin_fleet, then admin_view)
      const roleOrder = { 'super_admin': 0, 'app_admin': 1, 'admin_fleet': 2, 'admin_view': 3 };
      return admins.sort((a, b) => {
        const orderA = roleOrder[a.role] ?? 999;
        const orderB = roleOrder[b.role] ?? 999;
        return orderA - orderB;
      });
    } catch (error) {
      console.error('Error getting all admins:', error);
      return [];
    }
  },

  // Get admin by email
  async getAdminByEmail(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const adminRef = doc(db, COLLECTIONS.ADMINS, normalizedEmail);
      const adminDoc = await getDoc(adminRef);
      
      if (adminDoc.exists()) {
        return {
          id: adminDoc.id,
          email: adminDoc.id,
          ...adminDoc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting admin by email:', error);
      return null;
    }
  },

  // Create or update admin
  async setAdmin(email, adminData) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Validate role
      const validRoles = ['super_admin', 'app_admin', 'admin_fleet', 'admin_view'];
      if (!validRoles.includes(adminData.role)) {
        throw new Error('Invalid role. Must be one of: super_admin, app_admin, admin_fleet, admin_view');
      }

      // If setting super_admin, check if another super_admin exists
      if (adminData.role === 'super_admin') {
        const existingAdmins = await this.getAllAdmins();
        const existingSuperAdmin = existingAdmins.find(
          admin => admin.role === 'super_admin' && admin.email !== normalizedEmail
        );
        
        if (existingSuperAdmin) {
          throw new Error('A super admin already exists. Only one super admin is allowed.');
        }
      }

      const adminRef = doc(db, COLLECTIONS.ADMINS, normalizedEmail);
      await setDoc(adminRef, {
        email: normalizedEmail,
        name: adminData.name || '',
        role: adminData.role,
        createdAt: adminData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      return true;
    } catch (error) {
      console.error('Error setting admin:', error);
      throw error;
    }
  },

  // Delete admin
  async deleteAdmin(email) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if this is the last super_admin
      const admin = await this.getAdminByEmail(normalizedEmail);
      if (admin && admin.role === 'super_admin') {
        const allAdmins = await this.getAllAdmins();
        const superAdminCount = allAdmins.filter(a => a.role === 'super_admin').length;
        if (superAdminCount === 1) {
          throw new Error('Cannot delete the last super admin. Please create another super admin first.');
        }
      }
      
      const adminRef = doc(db, COLLECTIONS.ADMINS, normalizedEmail);
      await deleteDoc(adminRef);
      return true;
    } catch (error) {
      console.error('Error deleting admin:', error);
      throw error;
    }
  },

  // Check if user has permission for a specific action
  async checkAdminPermission(email, requiredPermission) {
    try {
      const admin = await this.getAdminByEmail(email);
      if (!admin) return false;

      const role = admin.role;
      
      // Permission mapping
      const permissions = {
        'super_admin': ['view', 'edit', 'create', 'delete', 'manage_admins', 'edit_fee_structure', 'edit_facilities'],
        'app_admin': ['view', 'view_admins', 'create_lower_admins', 'edit_fee_structure', 'edit_facilities'],
        'admin_fleet': ['view', 'edit_fee_structure', 'edit_facilities'],
        'admin_view': ['view']
      };

      const rolePermissions = permissions[role] || [];
      return rolePermissions.includes(requiredPermission);
    } catch (error) {
      console.error('Error checking admin permission:', error);
      return false;
    }
  },

  // Initialize first super admin (one-time setup)
  // Can use Cloud Function or direct Firestore write
  async initializeSuperAdmin(email, name = '', useCloudFunction = false) {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Option 1: Use Cloud Function (recommended for production)
      if (useCloudFunction) {
        try {
          const initializeSuperAdminFn = httpsCallable(functions, 'initializeSuperAdmin');
          const result = await initializeSuperAdminFn({ email: normalizedEmail, name });
          return result.data;
        } catch (cloudError) {
          // Fall through to direct write
        }
      }
      
      // Option 2: Direct Firestore write (for development or if Cloud Function fails)
      // Check if any admins exist
      const existingAdmins = await this.getAllAdmins();
      
      if (existingAdmins.length > 0) {
        // Check if super_admin already exists
        const superAdminExists = existingAdmins.some(admin => admin.role === 'super_admin');
        if (superAdminExists) {
          throw new Error('A super admin already exists. Cannot initialize another one.');
        }
      }
      
      // Create the first super admin
      const success = await this.setAdmin(normalizedEmail, {
        name: name || normalizedEmail.split('@')[0],
        role: 'super_admin'
      });
      
      if (success) {
        return { success: true, message: `Super admin ${normalizedEmail} created successfully` };
      } else {
        throw new Error('Failed to create super admin');
      }
    } catch (error) {
      console.error('Error initializing super admin:', error);
      throw error;
    }
  }
};
