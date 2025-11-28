
import { useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";

const ThankYou = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleEndSession = async () => {
    // Sign out the user first
    await signOut();
    // Then navigate to home page
    navigate("/", { replace: true });
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <div className="text-center space-y-6 max-w-md animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 md:mb-8">
            Thank you for completing the welcome section of the onboarding stage!
          </h2>
          
          <p>
          You will receive the link for the virtual call shortly.
          </p>
          
          <p className="mt-6 md:mt-12">
            For any further queries or concerns, please do not hesitate to reach out to scout@laundryheap.com
          </p>
        </div>
        
        <Button 
          onClick={handleEndSession}
          className="w-full max-w-xs mt-6 md:mt-12"
        >
          End Session
        </Button>
      </div>
    </PageLayout>
  );
};

export default ThankYou;
