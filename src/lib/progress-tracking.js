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

  // Check acknowledgements summary
  if (userData.introCompleted && userData.progress_liabilities) {
    // Check if all acknowledgements are done
    const hasLiabilities = userData.progress_liabilities?.confirmed || 
                          userData.acknowledgedLiabilities || 
                          userData.liabilitiesAcknowledged;
    const hasBlocksClassification = userData.blocksClassificationAcknowledged;
    const hasFeeStructure = userData.feeStructureAcknowledged || 
                           userData.acknowledgedFeeStructure;
    const hasRoutesPolicy = userData.routesPolicyAcknowledged;
    const hasCancellationPolicy = userData.cancellationPolicyAcknowledged || 
                                  userData.acknowledgedCancellationPolicy;
    
    if (hasLiabilities && hasBlocksClassification && hasFeeStructure && 
        hasRoutesPolicy && hasCancellationPolicy) {
      return '/acknowledgements-summary';
    }
  }

  // Check liabilities (after smoking fitness check)
  if (userData.progress_smoking_fitness_check || 
      (userData.smokingStatus && userData.hasPhysicalDifficulties !== undefined)) {
    return '/liabilities';
  }

  // Check smoking fitness check (after cancellation policy)
  if (userData.progress_cancellation_policy || 
      userData.cancellationPolicyAcknowledged || 
      userData.acknowledgedCancellationPolicy) {
    return '/smoking-fitness-check';
  }

  // Check cancellation policy (after routes policy)
  if (userData.progress_routes_policy || userData.routesPolicyAcknowledged) {
    return '/cancellation-policy';
  }

  // Check routes policy (after fee structure)
  if (userData.progress_fee_structure || 
      userData.feeStructureAcknowledged || 
      userData.acknowledgedFeeStructure) {
    return '/how-route-works';
  }

  // Check fee structure (after blocks classification)
  if (userData.progress_blocks_classification || 
      userData.blocksClassificationAcknowledged) {
    return '/fee-structure';
  }

  // Check blocks classification (after facility locations)
  if (userData.progress_facility_locations || 
      userData.facilityLocationsAcknowledged || 
      userData.selectedFacilities) {
    return '/blocks-classification';
  }

  // Check facility locations (after availability)
  if (userData.progress_availability || userData.availability) {
    return '/facility-locations';
  }

  // Check availability (after role)
  if (userData.progress_role || userData.roleAcknowledged) {
    return '/availability';
  }

  // Check role (after about)
  if (userData.progress_about || userData.aboutAcknowledged) {
    return '/role';
  }

  // Check about (after introduction)
  if (userData.progress_introduction || userData.introductionAcknowledged) {
    return '/about';
  }

  // Check introduction (after confirm details)
  // Only check for actual progress flag, not just presence of fields
  // (Fields might exist from Fountain but user hasn't confirmed yet)
  if (userData.progress_confirm_details?.confirmed || userData.detailsConfirmed) {
    return '/introduction';
  }

  // Check confirm details (after verify)
  if (userData.progress_verify || userData.phoneVerified) {
    return '/confirm-details';
  }

  // If user has email but hasn't verified phone yet
  if (userData.email && !userData.phoneVerified && !userData.progress_verify) {
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

