import { useLocation } from "react-router-dom";

// Define the routes that should show progress bar (from confirm-details to liabilities)
const PROGRESS_ROUTES = [
  '/confirm-details',            // Step 1
  '/introduction',               // Step 2
  '/about',                      // Step 3
  '/role',                       // Step 4
  '/availability',               // Step 5
  '/facility-locations',         // Step 6
  '/blocks-classification',      // Step 7
  '/fee-structure',              // Step 8
  '/how-route-works',            // Step 9
  '/cancellation-policy',        // Step 10
  '/smoking-fitness-check',      // Step 11
  '/liabilities',                // Step 12
];

const ProgressBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Find the current step index within the progress routes
  const currentStepIndex = PROGRESS_ROUTES.findIndex(route => route === currentPath);
  const currentStep = currentStepIndex >= 0 ? currentStepIndex + 1 : 1;
  const totalSteps = PROGRESS_ROUTES.length;
  
  // Calculate progress percentage
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full px-4 py-4">
      <div className="max-w-4xl mx-auto border-2 border-white/30 rounded-2xl p-5 bg-white/10 backdrop-blur-sm shadow-lg">
        {/* Progress text showing current step in X/Y format */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-base font-semibold text-white">
            {currentStep}/{totalSteps}
          </span>
          <span className="text-sm font-medium text-white/90">
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative w-full h-3 bg-white/20 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-brand-yellow to-brand-shadeYellow transition-all duration-500 ease-out rounded-full shadow-md"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
