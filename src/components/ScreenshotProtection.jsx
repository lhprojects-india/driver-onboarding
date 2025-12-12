import { usePreventScreenshots } from "@/hooks/usePreventScreenshots";

/**
 * Component that wraps driver routes to prevent screenshots
 * This should only be applied to driver onboarding routes, not admin routes
 */
export default function ScreenshotProtection({ children }) {
  usePreventScreenshots();
  return <>{children}</>;
}

