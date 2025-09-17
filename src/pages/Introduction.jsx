
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";

const Introduction = () => {
  const navigate = useNavigate();

  const handleContinueAutomated = () => {
    navigate("/about");
  };

  const handleContactFleetAgent = () => {
    navigate("/fleet-agent");
  };

  return (
    <PageLayout className="flex flex-col items-center space-y-4"
      title="Hi there!"
      subtitle="Welcome to your introductory training session. Here you will understand the following things which would give you a fair idea of how things work at Laundryheap.This would take you 10-15 minutes to complete."
    >
      <div className="w-full flex flex-col items-center space-y-4">
        <p className="text-center text-l my-2 max-w-xs animate-fade-in">
          <ul className="list-disc list-inside text-left">
            <li>About the company</li>
            <li>Timings</li>
            <li>Liabilities</li>
            <li>Fee Structure</li>
            <li>Availability</li>
          </ul>
        </p>
        <Button 
          onClick={handleContinueAutomated}
          className="w-full max-w-xs"
        >
          Continue
        </Button>
        </div>
      <div className="w-full flex flex-col items-center space-y-4">
        <p className="text-center text-l my-6 md:my-12 max-w-xs animate-fade-in">
          If you need further help in person, you can choose the following option to speak to a Fleet Agent.
        </p>
        <Button 
          onClick={handleContactFleetAgent}
          className="w-full max-w-xs"
        >
          Speak to a Fleet Agent
        </Button>
      </div>
    </PageLayout>
  );
};

export default Introduction;
