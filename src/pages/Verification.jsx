
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useToast } from "@/hooks/use-toast";

const Verification = () => {
  const navigate = useNavigate();
  const { updateUserData } = useAuth();
  const { toast } = useToast();
  
  const [vehicle, setVehicle] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const handleContinue = () => {
    if (!vehicle || !licensePlate || !address || !city) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Save user verification data
    updateUserData({
      vehicle,
      licensePlate,
      address,
      city
    });
    
    navigate("/availability");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Verification stage
        </h2>
        
        <div className="w-full max-w-md space-y-4 animate-fade-in">
          <div>
            <p className="text-center mb-2">
              Please confirm your vehicle details (make and model)
            </p>
            <Input
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              required
            />
          </div>
          
          <div>
            <p className="text-center mb-2">
              Please confirm your license plate details
            </p>
            <Input
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              required
            />
          </div>
          
          <div>
            <p className="text-center mb-2">
              Please confirm your address details
            </p>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
          
          <div>
            <p className="text-center mb-2">
              City
            </p>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-4 md:mt-8"
        >
          I confirm the authenticity of the details provided here
        </Button>
      </div>
    </PageLayout>
  );
};

export default Verification;
