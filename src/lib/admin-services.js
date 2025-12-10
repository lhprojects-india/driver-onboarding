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
  AUTHORIZED_EMAILS: 'authorized_emails'
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
          console.error(`Error checking drivers for ${normalizedEmail}:`, error);
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

      console.log(`[Admin] Found ${applications.length} applicants from fountain_applicants`);

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
          vehicleType: driverRecord.vehicleType || driverData?.vehicleType || null,
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
        acknowledgements: {
          // Role
          role: (
            driverRecord.roleUnderstood === true ||
            driverData?.roleUnderstood === true
          ) || false,
          roleDate: (
            driverRecord.roleUnderstoodAt ||
            driverData?.roleUnderstoodAt || null
          ),
          // Block Classification
          blockClassification: (
            driverRecord.blocksClassificationAcknowledged === true ||
            driverData?.blocksClassificationAcknowledged === true
          ) || false,
          blockClassificationDate: (
            driverRecord.blocksClassificationAcknowledgedAt ||
            driverData?.blocksClassificationAcknowledgedAt || null
          ),
          // Fee structure
          feeStructure: (
            driverRecord.acknowledgedFeeStructure === true ||
            driverRecord.feeStructureAcknowledged === true ||
            driverData?.acknowledgedFeeStructure === true ||
            driverData?.feeStructureAcknowledged === true
          ) || false,
          feeStructureDate: (
            driverRecord.feeStructureAcknowledgedAt ||
            driverData?.feeStructureAcknowledgedAt || null
          ),
          // Routes Policy
          routesPolicy: (
            driverRecord.routesPolicyAcknowledged === true ||
            driverData?.routesPolicyAcknowledged === true
          ) || false,
          routesPolicyDate: (
            driverRecord.routesPolicyAcknowledgedAt ||
            driverData?.routesPolicyAcknowledgedAt || null
          ),
          // Cancellation policy
          cancellationPolicy: (
            driverRecord.acknowledgedCancellationPolicy === true ||
            driverRecord.cancellationPolicyAcknowledged === true ||
            driverData?.acknowledgedCancellationPolicy === true ||
            driverData?.cancellationPolicyAcknowledged === true
          ) || false,
          cancellationPolicyDate: (
            driverRecord.cancellationPolicyAcknowledgedAt ||
            driverData?.cancellationPolicyAcknowledgedAt || null
          ),
          // Liabilities
          liabilities: (
            driverRecord.acknowledgedLiabilities === true ||
            driverRecord?.progress_liabilities?.confirmed === true ||
            driverData?.acknowledgedLiabilities === true
          ) || false,
          liabilitiesDate: (
            driverRecord.liabilitiesAcknowledgedAt ||
            driverRecord?.progress_liabilities?.confirmedAt ||
            driverData?.liabilitiesAcknowledgedAt || null
          ),
        },

        // Health & Safety
        healthAndSafety: {
          smokingStatus: driverRecord.smokingStatus || driverData?.smokingStatus || null,
          hasPhysicalDifficulties: driverRecord.hasPhysicalDifficulties || driverData?.hasPhysicalDifficulties || false,
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
        console.error(`❌ Driver not found: ${email}`);
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
        progress_how_route_works: null,
        progress_fee_structure: null,
        progress_liabilities: null,
        progress_cancellation_policy: null,
        progress_smoking_fitness: null,
        progress_about: null,
        progress_acknowledgements: null,
        // Clear acknowledgement flags
        acknowledgedFeeStructure: null,
        feeStructureAcknowledged: null,
        feeStructureAcknowledgedAt: null,
        acknowledgedLiabilities: null,
        liabilitiesAcknowledgedAt: null,
        acknowledgedCancellationPolicy: null,
        cancellationPolicyAcknowledged: null,
        cancellationPolicyAcknowledgedAt: null,
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
      const emailRef = doc(db, COLLECTIONS.AUTHORIZED_EMAILS, email.toLowerCase());
      await setDoc(emailRef, {
        email: email.toLowerCase(),
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
      const emailRef = doc(db, COLLECTIONS.AUTHORIZED_EMAILS, email.toLowerCase());
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
  }
};
