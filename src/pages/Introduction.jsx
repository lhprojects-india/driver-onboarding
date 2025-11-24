import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { useSaveProgress } from "@/hooks/useSaveProgress";

const Introduction = () => {
  const navigate = useNavigate();
  useSaveProgress(); // Automatically save progress when user visits this page

  const handleContinue = () => {
    navigate("/about");
  };

  return (
    <PageLayout className="flex flex-col items-center space-y-4"
      title="Hi there!"
      subtitle="Welcome to your introductory training session. In this module, you'll get a clear overview of how things work at Laundryheap. Completing this section will take approximately 10–15 minutes."
    >
      <div className="w-full flex flex-col items-center space-y-4">
        <div className="text-center text-l my-2 max-w-xs animate-fade-in">
          <p className="font-semibold mb-2">Things Covered:</p>
          <ul className="list-disc list-inside text-left">
            <li>About the Company</li>
            <li>Onboarding Stages</li>
            <li>Role Explanation</li>
            <li>Availability</li>
            <li>Fee Structure</li>
            <li>Cancellation Policy</li>
            <li>Liability</li>
          </ul>
        </div>
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs"
        >
          Continue
        </Button>
      </div>
    </PageLayout>
  );
};

export default Introduction;
