import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import AvailabilityGrid from "@/components/AvailabilityGrid";

const Availability = () => {
  const navigate = useNavigate();
  const { updateUserData } = useAuth();
  
  const [availability, setAvailability] = useState({
    Mondays: { noon: false, evening: false },
    Tuesdays: { noon: false, evening: false },
    Wednesdays: { noon: false, evening: false },
    Thursdays: { noon: false, evening: false },
    Fridays: { noon: false, evening: false },
    Saturdays: { noon: false, evening: false },
  });

  const handleContinue = () => {
    updateUserData({ availability });
    navigate("/role");
  };

  const handleAvailabilityChange = (newAvailability) => {
    setAvailability(newAvailability);
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Availability Check
        </h2>
        
        <div className="w-full max-w-md animate-fade-in">
          <p className="text-center mb-6">
            We offer our blocks in 2 windows, one starting at 12 pm and the other starting at 5 pm. We are operational 7 days a week.
          </p>
          
          <p className="text-center mb-6">
            Please share your general availability by making the appropriate selections
          </p>
          
          <AvailabilityGrid 
            availability={availability}
            onAvailabilityChange={handleAvailabilityChange}
          />
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-4 md:mt-8"
        >
          I confirm my weekly availability
        </Button>
      </div>
    </PageLayout>
  );
};

export default Availability;
