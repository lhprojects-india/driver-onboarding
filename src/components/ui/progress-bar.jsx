import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

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
      <div className="max-w-4xl mx-auto border border-white rounded-lg p-4">
        {/* Progress text showing current step in X/Y format */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-base font-semibold text-white">
            {currentStep}/{totalSteps}
          </span>
          <span className="text-sm text-white">
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="relative w-full h-2.5 bg-gray-200 rounded-full overflow-hidden mb-3">
          <div
            className="h-full bg-laundryheap-lightYellow transition-all duration-300 ease-in-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Step indicators - visual dots for each step */}
        <div className="flex justify-between gap-1">
          {PROGRESS_ROUTES.map((route, index) => {
            const stepNumber = index + 1;
            const isCurrent = route === currentPath;
            const isCompleted = currentStepIndex > index;
            
            return (
              <div
                key={route}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all duration-300",
                  isCurrent && "bg-laundryheap-lightYellow h-2 ring-2 ring-laundryheap-lightYellow ring-offset-1",
                  isCompleted && !isCurrent && "bg-laundryheap-lightYellow/60",
                  !isCompleted && !isCurrent && "bg-laundryheap-brandYellow"
                )}
                title={`Step ${stepNumber}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
