import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute } from "@/lib/progress-tracking";

const Welcome = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const { checkEmail, isLoading, currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect if user is already authenticated and has progress
  // BUT: Don't redirect if onboarding is completed - they should logout and start fresh
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser) {
      // If onboarding is completed, don't redirect - let them see welcome page
      // They should logout and start fresh
      if (currentUser.onboardingStatus === 'completed') {
        return;
      }
      
      // Check if user has any actual progress (not just mock data fields)
      // If they have no progress flags, they should stay on welcome page
      const hasActualProgress = 
        currentUser.progress_confirm_details?.confirmed === true ||
        currentUser.progress_verify?.confirmed === true ||
        currentUser.phoneVerified === true ||
        currentUser.detailsConfirmed === true ||
        currentUser.lastRoute;
      
      // If no actual progress, don't redirect - let them start from welcome
      if (!hasActualProgress) {
        return;
      }
      
      const nextRoute = getNextRoute(currentUser);
      // If user should be on a different page, redirect them
      // But don't redirect if they have no progress
      if (nextRoute !== '/' && nextRoute !== '/verify') {
        navigate(nextRoute, { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your registered email address.",
        variant: "destructive",
      });
      return;
    }
    
    // Clear the completed onboarding flag if user is starting fresh
    if (localStorage.getItem('mock_onboarding_completed') === 'true') {
      localStorage.removeItem('mock_onboarding_completed');
    }
    
    const result = await checkEmail(email);
    if (result.success) {
      navigate("/verify");
    }
  };

  return (
    <PageLayout title="Laundryheap Driver onboarding">
      <div className="flex-1 text-center">
        <span>
          Welcome to Laundryheap's partner onboarding process. This is an introduction to your Onboarding process.
          <br />
          By proceeding, you should be able to understand the key aspects of the job.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@laundryheap.com"
                type="email"
                required
              />
              
              <p className="text-center text-sm mt-4 md:mt-6 mb-4 md:mb-6 max-w-xs animate-fade-in">
                Please enter your registered email address provided with your Fountain application
              </p>
      
              <Button 
                type="submit" 
                className="mt-4 w-full max-w-xs"
                showArrow={true}
              >
                <Mail size={18} />
                {isLoading ? "Checking..." : "Continue"}
              </Button>
            </form>
    </PageLayout>
  );
};
export default Welcome;
