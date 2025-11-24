import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getNextRoute } from "@/lib/progress-tracking";

/**
 * Component that redirects users to their appropriate page based on progress
 * Should be used on routes that users might access when already authenticated
 */
const ProgressRedirect = ({ allowedRoutes = [] }) => {
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // Only redirect authenticated users
    if (!isAuthenticated || !currentUser) return;

    // Don't redirect if already on an allowed route
    if (allowedRoutes.includes(location.pathname)) return;

    // Don't redirect if already on the thank you page (final page)
    if (location.pathname === '/thank-you') return;

    // Determine where user should be based on their progress
    const nextRoute = getNextRoute(currentUser);

    // Only redirect if not already on the correct route
    if (location.pathname !== nextRoute && nextRoute !== '/') {
      console.log(`📍 Redirecting user to: ${nextRoute} (current: ${location.pathname})`);
      navigate(nextRoute, { replace: true });
    }
  }, [currentUser, isAuthenticated, isLoading, location.pathname, navigate, allowedRoutes]);

  return null;
};

export default ProgressRedirect;

