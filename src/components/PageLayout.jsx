import { useLocation } from "react-router-dom";
import LaundryheapLogo from "../assets/logo";
import ProgressBar from "./ui/progress-bar";

// Routes that should show the progress bar (from confirm-details to liabilities)
const PROGRESS_BAR_ROUTES = [
  '/confirm-details',
  '/introduction',
  '/about',
  '/role',
  '/availability',
  '/facility-locations',
  '/blocks-classification',
  '/fee-structure',
  '/how-route-works',
  '/cancellation-policy',
  '/smoking-fitness-check',
  '/liabilities',
];

function PageLayout({ children, title, subtitle, compact = false }) {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  
  // Show progress bar only on the specified routes (from confirm-details to liabilities)
  const showProgressBar = PROGRESS_BAR_ROUTES.includes(location.pathname) && !isAdminPage;

  return (
    <div className="laundryheap-page min-h-screen flex flex-col">
      <LaundryheapLogo/>
      
      {showProgressBar && <ProgressBar />}
      
      {title && (
        <h1 className={`text-center text-lg md:text-xl mt-2 md:mt-6 mb-4 md:mb-8 font-medium animate-slide-up ${compact ? "text-2xl md:text-3xl" : ""}`}>
          {title}
        </h1>
      )}
      
      {subtitle && (
        <h2 className="text-center text-base md:text-lg mt-2 md:mt-6 mb-4 md:mb-8 font-medium animate-slide-up">
          {subtitle}
        </h2>
      )}
      
      <div className="flex-1 w-full flex flex-col items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
}

export default PageLayout;
