
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const OnboardingStages = () => {
  const navigate = useNavigate();

  const handleContinue = () => {
    navigate("/liabilities");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Stages of the onboarding process
        </h2>
        
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-2">Stage 1 - welcome call</h3>
            <p className="text-sm">
              This section of the app explains about us as a company, your role with us as a partner driver, the fee structure, and our policies.
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-2">Stage 2 - Operational training</h3>
            <p className="text-sm">
              The app will walk you through our applications, how to use them, and the scenarios you will face while operating.
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-2">Stage 3 - Questionnaire Phase</h3>
            <p className="text-sm">
              The Onboarding questionnaire phase tests your knowledge of the previous two sections. You must complete it with a minimum score of 9/12.
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-xl mb-2">Stage 4 - First Slot phase</h3>
            <p className="text-sm">
              A 3-hour route with real customer tasks to provide hands-on experience as a partner driver.
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-4 md:mt-8"
        >
          Acknowledged
        </Button>
      </div>
    </PageLayout>
  );
};

export default OnboardingStages;
