import { createContext, useContext, useState, useEffect } from "react";
import { useToast } from "../hooks/use-toast";
import { authServices, driverServices } from "../lib/firebase-services";
import { adminServices } from "../lib/admin-services";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getAuthToken, clearAuthToken } from "../lib/cookie-utils";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if email is authorized admin (check admins collection in Firestore)
  const checkAdminAuthorization = async (email) => {
    if (!email) return false;
    
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check admins collection (single source of truth)
      try {
        const admin = await adminServices.getAdminByEmail(normalizedEmail);
        if (admin && admin.role) {
          return true;
        }
      } catch (firestoreError) {
        // Could not check admins collection
      }
      
      return false;
    } catch (error) {
      console.error('Error checking admin authorization:', error);
      return false;
    }
  };

  // Listen for authentication state changes
  useEffect(() => {
    // Note: Firebase Auth automatically persists sessions
    // The cookie is just a flag - Firebase will restore the session if it exists
    // Custom tokens are single-use, so we rely on Firebase's built-in session persistence

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // CRITICAL: Don't process driver authentication if on admin routes
      // Admin routes are handled by AdminAuthContext
      // Check on mount only, not on every navigation
      const currentPath = window.location.pathname;
      const isAdminRoute = currentPath && currentPath.startsWith('/admin');
      
      if (isAdminRoute) {
        // On admin route - don't interfere with admin authentication
        setIsLoading(false);
        return;
      }

      if (firebaseUser) {
        // User is authenticated with Firebase
        setIsAuthenticated(true);

        // Get email from multiple sources (user object, token claims, or localStorage)
        // Custom tokens may not have email in user.email, check token claims
        let userEmail = firebaseUser.email;
        
        // Try to extract email from token claims if user.email is null
        if (!userEmail) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult();
            userEmail = idTokenResult.claims.email || userEmail;
          } catch (tokenError) {
            // Silently handle token error
          }
        }
        
        // Fallback: Get email from localStorage (stored after phone verification)
        if (!userEmail) {
          userEmail = localStorage.getItem('driver_email');
        }
        
        // If still no email, try to extract from uid (uid format: driver_email_normalized)
        if (!userEmail && firebaseUser.uid) {
          const uidMatch = firebaseUser.uid.match(/^driver_(.+)$/);
          if (uidMatch) {
            // UID format: driver_email_normalized, reverse the normalization
            const normalizedUid = uidMatch[1];
            // Try to find email in Firestore drivers collection by matching uid pattern
            // Or we can store email->uid mapping somewhere
          }
        }
        
        // If still no email, we can't proceed
        if (!userEmail) {
          // Don't sign out immediately - wait a bit for localStorage to be set
          // The email might be set by verifyPhone function
          setTimeout(async () => {
            const retryEmail = localStorage.getItem('driver_email');
            if (!retryEmail) {
              await authServices.signOut();
              setIsAuthenticated(false);
              setCurrentUser(null);
            }
          }, 1000);
          
          setIsLoading(false);
          return;
        }
        
        // Email found - keep it in localStorage for now (will be cleaned up later)
        // Don't remove it yet in case onAuthStateChanged fires again

        // Check if user is an admin - if so, don't process driver authentication
        // Admins should be handled by AdminAuthContext
        // Check Firestore first (source of truth), then fallback to local config
        const isAdmin = await checkAdminAuthorization(userEmail);
        if (isAdmin) {
          setIsLoading(false);
          return;
        }

        // Load user data from Firestore
        const userData = await driverServices.getDriverData(userEmail);
        
        // If onboarding is completed, sign out the user automatically
        // They should start fresh if they want to go through onboarding again
        // BUT: Don't sign out if user is an admin (already checked above, but double-check)
        const isAdminCheck = await checkAdminAuthorization(userEmail);
        if (userData?.onboardingStatus === 'completed' && !isAdminCheck) {
          await authServices.signOut();
          setIsAuthenticated(false);
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }
        
        // Load availability and verification data from separate collections
        const [availabilityData, verificationData] = await Promise.all([
          driverServices.getAvailability(userEmail),
          driverServices.getVerification(userEmail),
        ]);
        
        if (userData) {
          setCurrentUser({
            email: userEmail,
            uid: firebaseUser.uid,
            ...userData,
            // Merge availability and verification data if they exist
            ...(availabilityData?.availability && { availability: availabilityData.availability }),
            ...(verificationData && {
              vehicle: verificationData.vehicle,
              licensePlate: verificationData.licensePlate,
              address: verificationData.address,
              city: verificationData.city,
            }),
          });
        } else {
          // Create user data if it doesn't exist
          setCurrentUser({
            email: userEmail,
            uid: firebaseUser.uid,
            ...(availabilityData?.availability && { availability: availabilityData.availability }),
            ...(verificationData && {
              vehicle: verificationData.vehicle,
              licensePlate: verificationData.licensePlate,
              address: verificationData.address,
              city: verificationData.city,
            }),
          });
        }
      } else {
        // User is not authenticated
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []); // Remove location.pathname dependency to prevent re-running on navigation

  // Restore email and fountainData from localStorage and re-authenticate if needed
  useEffect(() => {
    const restoreSession = async () => {
      // Only restore if we don't have currentUser and we're not loading
      if (!isLoading && !currentUser && !isAuthenticated) {
        const storedEmail = localStorage.getItem('driver_email');
        const storedFountainData = localStorage.getItem('driver_fountainData');
        const storedToken = getAuthToken();
        
        if (storedEmail && storedFountainData) {
          try {
            const fountainData = JSON.parse(storedFountainData);
            
            // Try to re-authenticate with stored token if available
            if (storedToken) {
              try {
                const { signInWithCustomToken } = await import('firebase/auth');
                await signInWithCustomToken(auth, storedToken);
                // onAuthStateChanged will handle setting the user data
                return;
              } catch (reAuthError) {
                clearAuthToken();
                // Continue to restore user data without Firebase auth
              }
            }
            
            // If no token or re-auth failed, just restore the user data
            setCurrentUser({
              email: storedEmail,
              fountainData: fountainData
            });
            // Mark as authenticated if we have valid user data
            // This handles cases where Firebase Auth loses the session but we have valid data
            setIsAuthenticated(true);
          } catch (e) {
            // Failed to restore session from localStorage
          }
        }
      }
    };
    
    restoreSession();
  }, [isLoading, currentUser, isAuthenticated]);

  // Check if email exists in Fountain applicants
  const checkEmail = async (email) => {
    setIsLoading(true);
    try {
      const result = await authServices.checkFountainApplicant(email);
      if (result.exists) {
        // Store email and fountain applicant data (including phone) for later phone match
        const userData = { 
          email, 
          fountainData: {
            phone: result.phone,
            name: result.name,
            applicantId: result.applicantId,
            city: result.city,
            country: result.country,
            funnelId: result.funnelId,
          }
        };
        setCurrentUser(userData);
        
        // Persist to localStorage so it survives page refresh/navigation
        localStorage.setItem('driver_email', email);
        localStorage.setItem('driver_fountainData', JSON.stringify(userData.fountainData));
        
        toast({
          title: "Email verified",
          description: "Please enter your registered mobile number to continue.",
        });
        setIsLoading(false);
        return { success: true, data: result };
      } else {
        toast({
          title: "Email not found",
          description: "No application found with this email. Please apply on Fountain first.",
          variant: "destructive",
        });
        setIsLoading(false);
        return { success: false };
      }
    } catch (error) {
      console.error("Email check failed", error);
      toast({
        title: "Verification failed",
        description: "Unable to verify email. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return { success: false };
    }
  };

  // Verify phone number against Fountain data
  const verifyPhone = async (phone) => {
    // Helper to normalize phone numbers for comparison
    const normalizePhone = (value) => (value || '').replace(/[^\d+]/g, '');

    // Try to get email from currentUser, or restore from localStorage
    let emailToUse = currentUser?.email || currentUser?.fountainData?.email;
    let fountainDataToUse = currentUser?.fountainData;
    
    // If currentUser doesn't have email, try to restore from localStorage
    if (!emailToUse) {
      emailToUse = localStorage.getItem('driver_email');
      const storedFountainData = localStorage.getItem('driver_fountainData');
      if (storedFountainData) {
        try {
          fountainDataToUse = JSON.parse(storedFountainData);
          // Restore currentUser state from localStorage
          setCurrentUser({
            email: emailToUse,
            fountainData: fountainDataToUse
          });
        } catch (e) {
          // Failed to parse stored fountainData
        }
      }
    }

    if (!emailToUse) {
      toast({
        title: "No email found",
        description: "Please restart the authentication process from the welcome page.",
        variant: "destructive",
      });
      return false;
    }

    // Normalize phones for comparison (remove spaces, dashes, parentheses)
    const enteredPhone = normalizePhone(phone);

    // If we have fountainData.phone from the email check, enforce a strict match on client
    const expectedPhone = normalizePhone(fountainDataToUse?.phone);
    if (expectedPhone) {
      const matches = enteredPhone === expectedPhone;
      if (!matches) {
        toast({
          title: "Verification failed",
          description: "Mobile number does not match our records.",
          variant: "destructive",
        });
        return false;
      }
    }

    setIsLoading(true);
    try {
      // Store email in localStorage before verification (fallback if Firebase user.email is null)
      localStorage.setItem('driver_email', emailToUse);
      
      const result = await authServices.verifyPhoneNumber(emailToUse, phone);
      if (result.success) {
        // Store email in localStorage for use by onAuthStateChanged
        // This ensures email is available even if Firebase user.email is null
        localStorage.setItem('driver_email', emailToUse);
        
        // Prepare data to save to Firestore
        const dataToSave = {
          phoneVerified: true,
          progress_verify: { confirmed: true, confirmedAt: new Date().toISOString() }
        };
        
        // Store Fountain applicant data in currentUser for later use
        if (result.applicant) {
          setCurrentUser(prev => ({
            ...prev,
            email: emailToUse, // Ensure email is set
            fountainData: result.applicant,
            phoneVerified: true,
            progress_verify: { confirmed: true, confirmedAt: new Date().toISOString() }
          }));
          
          // Save Fountain data to Firestore so it persists across auth state changes
          dataToSave.fountainData = result.applicant;
          
          // Only include fields that have values (to avoid validation errors)
          if (result.applicant.name) {
            dataToSave.name = result.applicant.name;
          }
          if (result.applicant.phone) {
            dataToSave.phone = result.applicant.phone;
          }
          if (result.applicant.city) {
            dataToSave.city = result.applicant.city;
          }
          if (result.applicant.country) {
            dataToSave.country = result.applicant.country;
          }
        } else {
          setCurrentUser(prev => ({
            ...prev,
            email: emailToUse, // Ensure email is set
            phoneVerified: true,
            progress_verify: { confirmed: true, confirmedAt: new Date().toISOString() }
          }));
        }
        
        // Save phone verification status and Fountain data to Firestore
        await driverServices.updatePersonalDetails(emailToUse, dataToSave);
        
        // Authentication successful, user data is already loaded by onAuthStateChanged
        toast({
          title: "Verification successful",
          description: "Welcome to Laundryheap driver onboarding!",
        });
        setIsLoading(false);
        return true;
      } else {
        toast({
          title: "Verification failed",
          description: result.message || "Mobile number does not match our records.",
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Phone verification failed", error);
      toast({
        title: "Verification failed",
        description: "Unable to verify mobile number. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  // Update user data in Firestore
  const updateUserData = async (data) => {
    if (!currentUser?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to update your information.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const success = await driverServices.updatePersonalDetails(currentUser.email, data);
      if (success) {
        // Update local state
        setCurrentUser(prev => ({ ...prev, ...data }));

        // Save current step progress
        if (data.step) {
          await driverServices.updateOnboardingProgress(currentUser.email, data.step, data);
        }

        return true;
      }
    } catch (error) {
      console.error("Error updating user data:", error);

      // Extract validation error messages
      let errorMessage = "Unable to save your information. Please try again.";
      if (error.message && error.message.includes("Validation failed")) {
        try {
          const validationErrors = JSON.parse(error.message.replace("Validation failed: ", ""));
          const errorFields = Object.keys(validationErrors);
          if (errorFields.length > 0) {
            errorMessage = `${errorFields[0]}: ${validationErrors[errorFields[0]]}`;
          }
        } catch (parseError) {
          errorMessage = "Please check your input data and try again.";
        }
      } else if (error.message && error.message.includes("Invalid")) {
        errorMessage = error.message;
      }

      toast({
        title: "Update failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  // Save availability data
  const saveAvailability = async (availability) => {
    if (!currentUser?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save availability.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const success = await driverServices.saveAvailability(currentUser.email, availability);
      if (success) {
        setCurrentUser(prev => ({ ...prev, availability }));
        await driverServices.updateOnboardingProgress(currentUser.email, 'availability', { availability });
        return true;
      }
    } catch (error) {
      console.error("Error saving availability:", error);

      // Extract validation error messages
      let errorMessage = "Unable to save availability. Please try again.";
      if (error.message && error.message.includes("Please select at least one time slot")) {
        errorMessage = error.message;
      } else if (error.message && error.message.includes("Invalid")) {
        errorMessage = error.message;
      }

      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  // Save verification data
  const saveVerificationData = async (verificationData) => {
    if (!currentUser?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save verification data.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const success = await driverServices.saveVerification(currentUser.email, verificationData);
      if (success) {
        setCurrentUser(prev => ({ ...prev, ...verificationData }));
        await driverServices.updateOnboardingProgress(currentUser.email, 'verification', verificationData);
        return true;
      }
    } catch (error) {
      console.error("Error saving verification data:", error);

      // Extract validation error messages
      let errorMessage = "Unable to save verification data. Please try again.";
      if (error.message && error.message.includes(":")) {
        // Extract field-specific validation errors
        const fieldError = error.message.split(":")[0];
        const fieldMessage = error.message.split(":")[1];
        errorMessage = `${fieldError}: ${fieldMessage}`;
      } else if (error.message && error.message.includes("Validation failed")) {
        try {
          const validationErrors = JSON.parse(error.message.replace("Validation failed: ", ""));
          const errorFields = Object.keys(validationErrors);
          if (errorFields.length > 0) {
            errorMessage = `${errorFields[0]}: ${validationErrors[errorFields[0]]}`;
          }
        } catch (parseError) {
          errorMessage = "Please check your input data and try again.";
        }
      } else if (error.message && error.message.includes("Invalid")) {
        errorMessage = error.message;
      }

      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive",
      });
      return false;
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    if (!currentUser?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to complete onboarding.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const success = await driverServices.completeOnboarding(currentUser.email);
      if (success) {
        // Generate onboarding report
        const reportResult = await driverServices.generateReport(currentUser.email);
        
        setCurrentUser(prev => ({ 
          ...prev, 
          onboardingStatus: 'completed',
          reportId: reportResult.reportId 
        }));
        
        toast({
          title: "Onboarding completed",
          description: "Welcome to the Laundryheap driver team!",
        });
        return true;
      } else {
        toast({
          title: "Completion failed",
          description: "Unable to complete onboarding. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Completion failed",
        description: "Unable to complete onboarding. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const success = await authServices.signOut();
      if (success) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        // Cookie is already cleared in signOut function
        toast({
          title: "Signed out successfully",
          description: "You have been signed out.",
        });
        return true;
      } else {
        toast({
          title: "Sign out failed",
          description: "Unable to sign out. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign out failed",
        description: "Unable to sign out. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    checkEmail,
    verifyPhone,
    updateUserData,
    saveAvailability,
    saveVerificationData,
    completeOnboarding,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
