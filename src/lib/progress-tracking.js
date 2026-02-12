/**
 * Progress tracking utilities
 * Determines the next route based on user's onboarding progress
 */

// Define the onboarding flow order
export const ONBOARDING_ROUTES = [
  '/',                          // Welcome
  '/verify',                     // Phone verification
  '/confirm-details',            // Confirm personal details
  '/introduction',               // Introduction
  '/about',                      // About
  '/role',                       // Role
  '/availability',               // Availability
  '/facility-locations',         // Facility Locations
  '/blocks-classification',      // Blocks Classification
  '/fee-structure',              // Fee Structure
  '/how-route-works',            // How Route Works
  '/cancellation-policy',        // Cancellation Policy
  '/smoking-fitness-check',      // Smoking/Fitness Check
  '/liabilities',                // Liabilities
  '/acknowledgements-summary',   // Acknowledgements Summary
  '/thank-you',                  // Thank You (final)
];

/**
 * Maps step names to routes
 */
export const STEP_TO_ROUTE = {
  'welcome': '/',
  'verify': '/verify',
  'confirm_details': '/confirm-details',
  'introduction': '/introduction',
  'about': '/about',
  'role': '/role',
  'availability': '/availability',
  'facility_locations': '/facility-locations',
  'blocks_classification': '/blocks-classification',
  'fee_structure': '/fee-structure',
  'routes_policy': '/how-route-works',
  'cancellation_policy': '/cancellation-policy',
  'smoking_fitness_check': '/smoking-fitness-check',
  'liabilities': '/liabilities',
  'acknowledgements_summary': '/acknowledgements-summary',
};

/**
 * Determines the next route based on user's progress
 * Returns the route the user should be redirected to
 */
export function getNextRoute(userData) {
  if (!userData) {
    return '/';
  }

  // If onboarding is completed, user should logout and start fresh
  // Don't redirect them anywhere - they should see welcome page
  if (userData.onboardingStatus === 'completed') {
    return '/';
  }

  // Check acknowledgements summary - only after liabilities is confirmed
  if (userData.progress_liabilities?.confirmed === true) {
    // Check if all acknowledgements are done (all must be explicitly true)
    const hasLiabilities = userData.progress_liabilities?.confirmed === true ||
      userData.acknowledgedLiabilities === true;
    const hasBlocksClassification = userData.blocksClassificationAcknowledged === true;
    const hasFeeStructure = userData.feeStructureAcknowledged === true ||
      userData.acknowledgedFeeStructure === true;
    const hasRoutesPolicy = userData.routesPolicyAcknowledged === true;
    const hasCancellationPolicy = userData.cancellationPolicyAcknowledged === true ||
      userData.acknowledgedCancellationPolicy === true;
    const hasSmokingFitness = userData.progress_smoking_fitness_check?.confirmed === true;

    if (hasLiabilities && hasBlocksClassification && hasFeeStructure &&
      hasRoutesPolicy && hasCancellationPolicy && hasSmokingFitness) {
      return '/acknowledgements-summary';
    }
  }

  // Check liabilities (after smoking fitness check)
  // Only check explicit progress flag with confirmed: true
  if (userData.progress_smoking_fitness_check?.confirmed === true) {
    return '/liabilities';
  }

  // Check smoking fitness check (after cancellation policy)
  if (userData.progress_cancellation_policy?.confirmed === true ||
    userData.cancellationPolicyAcknowledged === true ||
    userData.acknowledgedCancellationPolicy === true) {
    return '/smoking-fitness-check';
  }

  // Check cancellation policy (after routes policy)
  if (userData.progress_routes_policy?.confirmed === true ||
    userData.routesPolicyAcknowledged === true) {
    return '/cancellation-policy';
  }

  // Check routes policy (after fee structure)
  if (userData.progress_fee_structure?.confirmed === true ||
    userData.feeStructureAcknowledged === true ||
    userData.acknowledgedFeeStructure === true) {
    return '/how-route-works';
  }

  // Check fee structure (after blocks classification)
  if (userData.progress_blocks_classification?.confirmed === true ||
    userData.blocksClassificationAcknowledged === true) {
    return '/fee-structure';
  }

  // Check blocks classification (after facility locations)
  if (userData.progress_facility_locations?.confirmed === true ||
    userData.facilityLocationsAcknowledged === true) {
    return '/blocks-classification';
  }

  // Check facility locations (after availability)
  // Check for actual availability data being saved with confirmed flag
  if (userData.progress_availability?.confirmed === true) {
    return '/facility-locations';
  }

  // Check availability (after role)
  if (userData.progress_role?.confirmed === true ||
    userData.roleAcknowledged === true) {
    return '/availability';
  }

  // Check role (after about)
  if (userData.progress_about?.confirmed === true ||
    userData.aboutAcknowledged === true) {
    return '/role';
  }

  // Check about (after introduction)
  if (userData.progress_introduction?.confirmed === true ||
    userData.introductionAcknowledged === true) {
    return '/about';
  }

  // Check introduction (after confirm details)
  // Only check for actual progress flag, not just presence of fields
  // (Fields might exist from Fountain but user hasn't confirmed yet)
  if (userData.progress_confirm_details?.confirmed === true || userData.detailsConfirmed === true) {
    return '/introduction';
  }

  // Check confirm details (after verify)
  if (userData.progress_verify?.confirmed === true || userData.phoneVerified === true) {
    return '/confirm-details';
  }

  // If user has email but hasn't verified phone yet
  if (userData.email && userData.phoneVerified !== true && userData.progress_verify?.confirmed !== true) {
    return '/verify';
  }

  // If no specific progress found but user has a lastRoute saved, use it as fallback
  // BUT: Only use lastRoute if onboarding is not completed
  if (userData.onboardingStatus !== 'completed' &&
    userData.lastRoute &&
    ONBOARDING_ROUTES.includes(userData.lastRoute)) {
    return userData.lastRoute;
  }

  // Default: start from welcome
  return '/';
}

/**
 * Gets the current stage name for display purposes
 */
export function getCurrentStage(userData) {
  if (!userData) {
    return 'Not Started';
  }

  // If onboarding is completed
  if (userData.onboardingStatus === 'completed') {
    return 'Completed';
  }

  // If withdrawn/rejected
  if (userData.status === 'rejected' || userData.status === 'withdrawn') {
    return `Withdrawn/Rejected (${userData.status})`;
  }

  // Check lastRoute first as it's most accurate
  if (userData.lastRoute) {
    const routeToStage = {
      '/': 'Welcome',
      '/verify': 'Phone Verification',
      '/confirm-details': 'Confirm Details',
      '/introduction': 'Introduction',
      '/about': 'About Company',
      '/role': 'Role',
      '/availability': 'Availability',
      '/facility-locations': 'Facility Locations',
      '/blocks-classification': 'Blocks Classification',
      '/fee-structure': 'Fee Structure',
      '/how-route-works': 'How Route Works',
      '/cancellation-policy': 'Cancellation Policy',
      '/smoking-fitness-check': 'Smoking/Fitness Check',
      '/liabilities': 'Liabilities',
      '/acknowledgements-summary': 'Acknowledgements Summary',
      '/thank-you': 'Thank You',
    };
    return routeToStage[userData.lastRoute] || 'Unknown Stage';
  }

  // Fallback to determining stage from progress
  const nextRoute = getNextRoute(userData);
  const routeToStage = {
    '/': 'Welcome',
    '/verify': 'Phone Verification',
    '/confirm-details': 'Confirm Details',
    '/introduction': 'Introduction',
    '/about': 'About Company',
    '/role': 'Role',
    '/availability': 'Availability',
    '/blocks-classification': 'Blocks Classification',
    '/fee-structure': 'Fee Structure',
    '/how-route-works': 'How Route Works',
    '/cancellation-policy': 'Cancellation Policy',
    '/smoking-fitness-check': 'Smoking/Fitness Check',
    '/liabilities': 'Liabilities',
    '/acknowledgements-summary': 'Acknowledgements Summary',
    '/thank-you': 'Thank You',
  };
  return routeToStage[nextRoute] || 'Unknown Stage';
}

/**
 * Saves the current route as the last route visited
 */
export async function saveCurrentRoute(userEmail, route, driverServices) {
  if (!userEmail || !driverServices) return;

  try {
    await driverServices.updatePersonalDetails(userEmail, {
      lastRoute: route,
      lastRouteUpdatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving current route:', error);
  }
}


/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  EMAIL: 'driver_email',
  FOUNTAIN_DATA: 'driver_fountainData',
};

/**
 * Saves driver data to local storage for session persistence
 * Helps maintain state across page refreshes
 */
export function saveLocalDriverData(data) {
  if (typeof window === 'undefined') return;

  const { email, fountainData } = data;

  if (email) {
    localStorage.setItem(STORAGE_KEYS.EMAIL, email);
  }

  if (fountainData) {
    localStorage.setItem(STORAGE_KEYS.FOUNTAIN_DATA, JSON.stringify(fountainData));
  }
}

/**
 * Retrieves driver data from local storage
 * Used to restore session on page refresh
 */
export function getLocalDriverData() {
  if (typeof window === 'undefined') return { email: null, fountainData: null };

  const email = localStorage.getItem(STORAGE_KEYS.EMAIL);
  const fountainDataStr = localStorage.getItem(STORAGE_KEYS.FOUNTAIN_DATA);

  let fountainData = null;
  try {
    if (fountainDataStr) {
      fountainData = JSON.parse(fountainDataStr);
    }
  } catch (error) {
    console.error('Error parsing local fountain data:', error);
  }

  return { email, fountainData };
}

/**
 * Clears driver data from local storage
 * Used on logout
 */
export function clearLocalDriverData() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_KEYS.EMAIL);
  localStorage.removeItem(STORAGE_KEYS.FOUNTAIN_DATA);
}
