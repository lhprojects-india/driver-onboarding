
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import Switch from "@/components/Switch";
import { useToast } from "@/hooks/use-toast";

const Liabilities = () => {
  const navigate = useNavigate();
  const { updateUserData } = useAuth();
  const { toast } = useToast();
  
  const [liabilityConfirmed, setLiabilityConfirmed] = useState(false);
  const [hasDifficulties, setHasDifficulties] = useState(false);
  const [isSmoker, setIsSmoker] = useState(false);

  const handleContinue = () => {
    if (!liabilityConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please acknowledge the liabilities involved.",
        variant: "destructive",
      });
      return;
    }

    // Save user preferences
    updateUserData({
      hasPhysicalDifficulties: hasDifficulties,
      isSmoker: isSmoker
    });
    
    navigate("/verification");
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Liabilities, Physical fitness and smoking check
        </h2>
        
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <p className="text-center mb-6">
            Processed laundry is delicate and needs to be handled very carefully to avoid any stains, creases, or tears. If observed to have occurred during transit, you may be held liable for the damages.
          </p>
          
          <CheckboxWithLabel
            label="I understand and acknowledge the liabilities involved"
            checked={liabilityConfirmed}
            onChange={setLiabilityConfirmed}
          />
          
          <div className="mb-6">
            <p className="text-center mb-4">
              Please confirm if you have any difficulty with driving, carrying bags & hangers, or climbing multiple floors if required
            </p>
            
            <Switch
              leftLabel="No, I don't have"
              rightLabel="Yes, I have"
              checked={hasDifficulties}
              onChange={setHasDifficulties}
            />
          </div>
          
          <div className="mb-4 md:mb-8">
            <p className="text-center mb-4">
              Do you smoke?
            </p>
            
            <Switch
              leftLabel="No"
              rightLabel="Yes"
              checked={isSmoker}
              onChange={setIsSmoker}
            />
          </div>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-6"
        >
          I confirm the authenticity of the details provided here
        </Button>
      </div>
    </PageLayout>
  );
};

export default Liabilities;
