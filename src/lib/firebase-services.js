import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import {
  signInWithCustomToken,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import { validateAndSanitize, validateField } from './validation';
import { saveAuthToken, clearAuthToken, getAuthToken } from './cookie-utils';

// Collection names
const COLLECTIONS = {
  DRIVERS: 'drivers',
  FOUNTAIN_APPLICANTS: 'fountain_applicants',
  ONBOARDING: 'onboarding',
  AVAILABILITY: 'availability',
  VERIFICATION: 'verification',
  REPORTS: 'reports',
  FEE_STRUCTURES: 'fee_structures',
  FACILITIES: 'facilities'
};

// Collections are now auto-generated from webhook data (city + role)
// No need to manually add them anymore!
// Backend automatically creates collections like: fountain_applicants_dublin_partner_driver
// All fountain_applicants_* collections are searched automatically by backend

// Authentication Services
export const authServices = {
  // Check if email exists in Fountain applicants (uses cloud function - no auth required)
  async checkFountainApplicant(email) {
    try {
      // Use cloud function instead of direct Firestore access
      // This allows checking email before authentication
      const checkFountainEmail = httpsCallable(functions, 'checkFountainEmail');
      const result = await checkFountainEmail({ email });

      if (result.data.exists) {
        return {
          exists: true,
          phone: result.data.phone,
          name: result.data.name,
          applicantId: result.data.applicantId,
          city: result.data.city,
          country: result.data.country,
          funnelId: result.data.funnelId,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking Fountain applicant:', error);
      return { exists: false, error: error.message };
    }
  },

  // Verify phone number against Fountain data (same approach as email check)
  async verifyPhoneNumber(email, phone) {
    try {
      // Use callable function (same as checkFountainEmail) - no CORS issues
      const verifyApplicantPhone = httpsCallable(functions, 'verifyApplicantPhone');
      const result = await verifyApplicantPhone({ email, phone });

      if (result.data.isValid) {
        // Store email in localStorage BEFORE sign-in (for use by onAuthStateChanged)
        // This ensures email is available even if Firebase user.email is null
        localStorage.setItem('driver_email', email);

        // Create custom token for Firebase authentication first
        const createCustomToken = httpsCallable(functions, 'createCustomToken');
        const tokenResult = await createCustomToken({ email });

        if (tokenResult.data.success && tokenResult.data.customToken) {
          // Sign in with the custom token
          await signInWithCustomToken(auth, tokenResult.data.customToken);

          // Save token to cookie for session persistence
          saveAuthToken(tokenResult.data.customToken);
          // Note: User creation is now handled by createCustomToken cloud function
          // (uses admin privileges, so no permission issues)

          return {
            success: true,
            applicant: result.data.applicant,
            token: tokenResult.data.customToken,
          };
        } else {
          return {
            success: false,
            message: 'Authentication failed. Please try again.',
          };
        }
      }

      return {
        success: false,
        message: result.data.message || "Verification failed",
      };
    } catch (error) {
      console.error('Error verifying phone number:', error);

      // Handle specific error cases
      let errorMessage = 'Unable to verify phone number. Please try again.';
      if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
      };
    }
  },

  // Create or update user in Firestore
  async createOrUpdateUser(email) {
    try {
      const userRef = doc(db, COLLECTIONS.DRIVERS, email);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        // Create new user
        await setDoc(userRef, {
          email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          onboardingStatus: 'started',
          isActive: true,
        });
      } else {
        // Update existing user
        await updateDoc(userRef, {
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  },

  // Sign out
  async signOut() {
    try {
      await firebaseSignOut(auth);
      // Clear authentication token from cookies
      clearAuthToken();
      // Clear local storage
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      // Still clear cookies even if sign out fails
      clearAuthToken();
      return false;
    }
  },

  // Check if session cookie exists (Firebase Auth handles actual session persistence)
  // Custom tokens are single-use, so we can't reuse them, but Firebase maintains the session
  // This is just a flag check - Firebase Auth will restore the session automatically
  hasSessionCookie() {
    return getAuthToken() !== null;
  },
};

// Driver Data Services
export const driverServices = {
  // Update driver personal details
  async updatePersonalDetails(email, details) {
    try {
      // Validate email format first
      const emailValidation = validateField('email', email);
      if (!emailValidation.isValid) {
        throw new Error(`Invalid email: ${emailValidation.message}`);
      }

      // Validate and sanitize the details
      const validation = validateAndSanitize(details);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
      }

      const userRef = doc(db, COLLECTIONS.DRIVERS, email);
      // Use setDoc with merge to create document if it doesn't exist
      await setDoc(userRef, {
        email,
        ...validation.data,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('❌ Error updating personal details:', error);
      console.error('Error details:', error.message, error.code);
      throw error;
    }
  },

  // Save availability data
  async saveAvailability(email, availability) {
    try {
      // Validate email format first
      const emailValidation = validateField('email', email);
      if (!emailValidation.isValid) {
        throw new Error(`Invalid email: ${emailValidation.message}`);
      }

      // Validate availability data structure
      if (!availability || typeof availability !== 'object') {
        throw new Error('Invalid availability data');
      }

      // Check if availability has at least one day with some availability
      const hasAvailability = Object.values(availability).some(day =>
        day && (day.morning || day.noon || day.evening)
      );

      if (!hasAvailability) {
        throw new Error('Please select at least one time slot');
      }

      const availabilityRef = doc(db, COLLECTIONS.AVAILABILITY, email);
      await setDoc(availabilityRef, {
        email,
        availability,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error saving availability:', error);
      throw error;
    }
  },

  // Save verification data
  async saveVerification(email, verificationData) {
    try {
      // Validate email format first
      const emailValidation = validateField('email', email);
      if (!emailValidation.isValid) {
        throw new Error(`Invalid email: ${emailValidation.message}`);
      }

      // Validate only fields that are provided (allow partial data for mock mode)
      const fieldsToValidate = ['vehicle', 'licensePlate', 'address', 'city'];
      for (const field of fieldsToValidate) {
        if (verificationData[field] !== undefined && verificationData[field] !== null) {
          const validation = validateField(field, verificationData[field]);
          if (!validation.isValid) {
            // Continue instead of throwing for mock mode compatibility
          }
        }
      }

      // Validate and sanitize the verification data
      const validation = validateAndSanitize(verificationData);
      if (!validation.isValid) {
        // Use original data if validation fails (for mock mode compatibility)
      }

      const verificationRef = doc(db, COLLECTIONS.VERIFICATION, email);
      await setDoc(verificationRef, {
        email,
        ...(validation.data || verificationData),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return true;
    } catch (error) {
      console.error('❌ Error saving verification:', error);
      console.error('Error details:', error.message, error.code);
      throw error;
    }
  },

  // Get driver data
  async getDriverData(email) {
    try {
      // Validate email before using it
      if (!email || typeof email !== 'string') {
        return null;
      }

      const userRef = doc(db, COLLECTIONS.DRIVERS, email);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Check if fountainData needs to be enriched with full webhook structure
        const needsEnrichment = userData.fountainData &&
          (!userData.fountainData.data) &&
          (!userData.fountainData.applicant);

        if (needsEnrichment) {
          try {
            const fountainApplicantRef = doc(db, COLLECTIONS.FOUNTAIN_APPLICANTS, email);
            const fountainApplicantDoc = await getDoc(fountainApplicantRef);

            if (fountainApplicantDoc.exists()) {
              const fountainApplicantData = fountainApplicantDoc.data();

              // Merge the full fountainData if available
              if (fountainApplicantData.fountainData) {
                // Deep merge to preserve nested structures
                userData.fountainData = {
                  ...userData.fountainData, // Keep existing simplified data
                  ...fountainApplicantData.fountainData, // Merge full webhook payload
                  // Ensure nested structures are preserved
                  ...(fountainApplicantData.fountainData.data && {
                    data: {
                      ...(userData.fountainData.data || {}),
                      ...fountainApplicantData.fountainData.data
                    }
                  }),
                  ...(fountainApplicantData.fountainData.applicant && {
                    applicant: {
                      ...(userData.fountainData.applicant || {}),
                      ...fountainApplicantData.fountainData.applicant,
                      ...(fountainApplicantData.fountainData.applicant.data && {
                        data: {
                          ...(userData.fountainData.applicant?.data || {}),
                          ...fountainApplicantData.fountainData.applicant.data
                        }
                      })
                    }
                  })
                };

                // Save enriched fountainData back to Firestore so it persists
                // This prevents needing to fetch and merge on every getDriverData call
                // Use setDoc with merge to handle complex nested structures
                try {
                  await setDoc(userRef, {
                    fountainData: userData.fountainData,
                    updatedAt: serverTimestamp()
                  }, { merge: true });
                } catch (saveError) {
                  // Non-critical - continue with enriched data in memory
                  // The data will still be available for this session
                }
              }
            } else {
              // No fountain_applicants document found
            }
          } catch (error) {
            // Continue with existing data
          }
        }

        return userData;
      }
      return null;
    } catch (error) {
      console.error('Error getting driver data:', error);
      return null;
    }
  },

  // Get availability data
  async getAvailability(email) {
    try {
      // Validate email before using it
      if (!email || typeof email !== 'string') {
        return null;
      }

      const availabilityRef = doc(db, COLLECTIONS.AVAILABILITY, email);
      const availabilityDoc = await getDoc(availabilityRef);

      if (availabilityDoc.exists()) {
        return availabilityDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting availability:', error);
      return null;
    }
  },

  // Get verification data
  async getVerification(email) {
    try {
      // Validate email before using it
      if (!email || typeof email !== 'string') {
        return null;
      }

      const verificationRef = doc(db, COLLECTIONS.VERIFICATION, email);
      const verificationDoc = await getDoc(verificationRef);

      if (verificationDoc.exists()) {
        return verificationDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting verification:', error);
      return null;
    }
  },

  // Complete onboarding
  async completeOnboarding(email) {
    try {
      const userRef = doc(db, COLLECTIONS.DRIVERS, email);
      await updateDoc(userRef, {
        onboardingStatus: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  },

  // Update onboarding progress
  async updateOnboardingProgress(email, step, data) {
    try {
      const userRef = doc(db, COLLECTIONS.DRIVERS, email);
      const progressKey = `progress_${step}`;

      // Ensure progress object has confirmed flag and timestamp
      const progressData = {
        ...data,
        confirmed: true,
        confirmedAt: new Date().toISOString(),
      };

      await updateDoc(userRef, {
        [progressKey]: progressData,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      return false;
    }
  },

  // Get all drivers (admin function)
  async getAllDrivers() {
    try {
      const driversRef = collection(db, COLLECTIONS.DRIVERS);
      const querySnapshot = await getDocs(driversRef);
      const drivers = [];

      querySnapshot.forEach((doc) => {
        drivers.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return drivers;
    } catch (error) {
      console.error('Error getting all drivers:', error);
      return [];
    }
  },

  // Check if email exists
  async checkEmailExists(email) {
    try {
      const userRef = doc(db, COLLECTIONS.DRIVERS, email);
      const userDoc = await getDoc(userRef);
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  },

  // Generate onboarding report
  async generateReport(email) {
    try {
      const generateOnboardingReport = httpsCallable(functions, 'generateOnboardingReport');
      const result = await generateOnboardingReport();

      if (result.data.success) {
        return {
          success: true,
          reportId: result.data.reportId,
        };
      }

      return {
        success: false,
        message: 'Failed to generate report',
      };
    } catch (error) {
      console.error('Error generating report:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },
};

// Acknowledgement Services (Cloud Functions)
export const acknowledgementServices = {
  async acknowledgeFeeStructure() {
    try {
      const fn = httpsCallable(functions, 'acknowledgeFeeStructure');
      const res = await fn();
      return { success: true, alreadyAcknowledged: res.data?.alreadyAcknowledged || false };
    } catch (error) {
      console.error('Error acknowledging fee structure:', error);
      return { success: false, message: error.message };
    }
  },
  async acknowledgeLiabilities() {
    try {
      const fn = httpsCallable(functions, 'acknowledgeLiabilities');
      const res = await fn();
      return { success: true, alreadyAcknowledged: res.data?.alreadyAcknowledged || false };
    } catch (error) {
      console.error('Error acknowledging liabilities:', error);
      return { success: false, message: error.message };
    }
  },
  async acknowledgeCancellationPolicy() {
    try {
      const fn = httpsCallable(functions, 'acknowledgeCancellationPolicy');
      const res = await fn();
      return { success: true, alreadyAcknowledged: res.data?.alreadyAcknowledged || false };
    } catch (error) {
      console.error('Error acknowledging cancellation policy:', error);
      return { success: false, message: error.message };
    }
  },
  async acknowledgePaymentCycleSchedule() {
    try {
      const fn = httpsCallable(functions, 'acknowledgePaymentCycleSchedule');
      const res = await fn();
      return { success: true, alreadyAcknowledged: res.data?.alreadyAcknowledged || false };
    } catch (error) {
      console.error('Error acknowledging payment cycle & schedule:', error);
      return { success: false, message: error.message };
    }
  }
};

// Fee Structure Services
export const feeStructureServices = {
  // Get fee structures for a specific city
  // vehicleType: "van" | "car" (optional, only needed for vehicle-specific fees)
  async getFeeStructuresByCity(city, vehicleType = null) {
    try {
      if (!city) {
        return null;
      }

      // Normalize city name for consistent lookups
      const normalizedCity = city.toLowerCase().trim();

      const feeStructureRef = doc(db, COLLECTIONS.FEE_STRUCTURES, normalizedCity);
      const feeStructureDoc = await getDoc(feeStructureRef);

      if (feeStructureDoc.exists()) {
        const feeStructure = feeStructureDoc.data();

        // If it's a vehicle-specific fee structure, return the appropriate vehicle type blocks
        if (feeStructure.feeType === 'vehicle-specific') {
          if (!vehicleType) {
            // If vehicle type not provided, default to car
            vehicleType = 'car';
          }

          // Validate that vehicle-specific blocks exist
          if (!feeStructure.blocks || typeof feeStructure.blocks !== 'object') {
            return null;
          }

          // Return structure with appropriate vehicle-specific blocks
          if (feeStructure.blocks[vehicleType] && Array.isArray(feeStructure.blocks[vehicleType]) && feeStructure.blocks[vehicleType].length > 0) {
            return {
              ...feeStructure,
              blocks: feeStructure.blocks[vehicleType],
              averageHourlyEarnings: feeStructure.averageHourlyEarnings?.[vehicleType] || feeStructure.averageHourlyEarnings,
              averagePerTaskEarnings: feeStructure.averagePerTaskEarnings?.[vehicleType] || feeStructure.averagePerTaskEarnings,
              vehicleType: vehicleType // Include vehicle type in response for reference
            };
          } else {
            // Fallback to car if vehicle type blocks not found
            if (feeStructure.blocks?.car && Array.isArray(feeStructure.blocks.car) && feeStructure.blocks.car.length > 0) {
              return {
                ...feeStructure,
                blocks: feeStructure.blocks.car,
                averageHourlyEarnings: feeStructure.averageHourlyEarnings?.car || feeStructure.averageHourlyEarnings,
                averagePerTaskEarnings: feeStructure.averagePerTaskEarnings?.car || feeStructure.averagePerTaskEarnings,
                vehicleType: 'car'
              };
            } else {
              return null;
            }
          }
        }

        // For general fee structures or backward compatibility, return as-is
        return feeStructure;
      }

      return null;
    } catch (error) {
      console.error('Error getting fee structures:', error);
      return null;
    }
  },

  // Get all fee structures (admin function)
  async getAllFeeStructures() {
    try {
      const feeStructuresRef = collection(db, COLLECTIONS.FEE_STRUCTURES);
      const querySnapshot = await getDocs(feeStructuresRef);
      const feeStructures = {};

      querySnapshot.forEach((doc) => {
        feeStructures[doc.id] = doc.data();
      });

      return feeStructures;
    } catch (error) {
      console.error('Error getting all fee structures:', error);
      return {};
    }
  },

  // Create or update fee structure for a city (admin function)
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
};

// Facility Services
export const facilityServices = {
  // Get facilities for a specific city
  async getFacilitiesByCity(city) {
    try {
      if (!city) {
        return [];
      }

      // Normalize city name for consistent lookups
      const normalizedCity = city.toLowerCase().trim();

      // Fetch all facilities and filter by city (case-insensitive)
      // Firestore doesn't support case-insensitive queries directly
      const facilitiesRef = collection(db, COLLECTIONS.FACILITIES);
      const querySnapshot = await getDocs(facilitiesRef);

      const facilities = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Case-insensitive city matching
        const facilityCity = data.city || data.City;
        if (facilityCity?.toLowerCase() === normalizedCity) {
          facilities.push({
            id: doc.id,
            City: facilityCity,
            Facility: data.facility || data.Facility,
            Address: data.address || data.Address
          });
        }
      });

      return facilities;
    } catch (error) {
      console.error('Error getting facilities by city:', error);
      return [];
    }
  },
};
