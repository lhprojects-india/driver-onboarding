import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getNextRoute } from "@/lib/progress-tracking";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

const Verify = () => {
  const [phone, setPhone] = useState("");
  const navigate = useNavigate();
  const { verifyPhone, isLoading, currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect to welcome if no email found (even after localStorage check)
  useEffect(() => {
    if (!isLoading) {
      const hasEmail = currentUser?.email || localStorage.getItem('driver_email');
      if (!hasEmail && !isAuthenticated) {
        // No email found - redirect to welcome page
        navigate('/', { replace: true });
        toast({
          title: "Email required",
          description: "Please enter your email address to continue.",
          variant: "destructive",
        });
      }
    }
  }, [isLoading, currentUser, isAuthenticated, navigate, toast]);

  // Redirect if user is already authenticated and has progress beyond verify
  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser?.phoneVerified) {
      const nextRoute = getNextRoute(currentUser);
      // If user should be on a different page, redirect them
      if (nextRoute !== '/verify' && nextRoute !== '/') {
        navigate(nextRoute, { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, currentUser, navigate]);

  const handleVerify = async () => {
    if (!phone) {
      toast({
        title: "Phone number required",
        description: "Please enter your registered phone number.",
        variant: "destructive",
      });
      return;
    }

    // PhoneInput already includes country code in the phone value
    const success = await verifyPhone(phone);
    if (success) {
      navigate("/confirm-details");
    }
  };

  return (
    <PageLayout title="Laundryheap Driver onboarding">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-2xl font-bold mb-6 animate-slide-down">
          Verify your mobile number
        </h2>
        
        <div className="w-full max-w-xs space-y-4 animate-fade-in">
          <p className="text-center text-sm text-white mb-4">
            We will match the mobile number with the email ID you entered to verify your identity.
          </p>
          
          <div className="w-full">
            <PhoneInput
              international
              defaultCountry="GB"
              value={phone}
              onChange={setPhone}
              className="phone-input-wrapper"
              withCountryCallingCode
              flagUrl="https://catamphetamine.github.io/country-flag-icons/3x2/{XX}.svg"
              numberInputProps={{
                className: "phone-number-input",
                placeholder: "12 345 6789",
                style: { textAlign: 'left' }
              }}
            />
            <p className="text-xs text-center mt-1 text-white opacity-70">*This field is mandatory</p>
          </div>
          
          <p className="text-center text-xs text-white opacity-80 mt-2">
            Enter the mobile number you registered with on Fountain
          </p>
        </div>

        <Button 
          onClick={handleVerify}
          className="mt-6 w-full max-w-xs"
          disabled={!phone || isLoading}
        >
          <Phone size={18} />
          {isLoading ? "Verifying..." : "Verify & Continue"}
        </Button>
      </div>
    </PageLayout>
  );
};

export default Verify;
