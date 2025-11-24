import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { driverServices } from "@/lib/firebase-services";

/**
 * Hook to automatically save the current route as progress
 * Should be used in pages that are part of the onboarding flow
 */
export function useSaveProgress() {
  const location = useLocation();
  const { currentUser, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only save if user is authenticated and has an email
    if (!isAuthenticated || !currentUser?.email) return;

    // Don't save routes that aren't part of the main flow
    const flowRoutes = [
      '/confirm-details',
      '/introduction',
      '/about',
      '/role',
      '/availability',
      '/blocks-classification',
      '/fee-structure',
      '/how-route-works',
      '/cancellation-policy',
      '/smoking-fitness-check',
      '/liabilities',
      '/acknowledgements-summary',
    ];

    if (flowRoutes.includes(location.pathname)) {
      // Save current route as last visited route
      driverServices.updatePersonalDetails(currentUser.email, {
        lastRoute: location.pathname,
        lastRouteUpdatedAt: new Date().toISOString(),
      }).catch(error => {
        console.error('Error saving current route:', error);
      });
    }
  }, [location.pathname, currentUser, isAuthenticated]);
}

