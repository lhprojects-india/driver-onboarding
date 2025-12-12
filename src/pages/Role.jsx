
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";
import roleExplanationImage from "@/assets/driver-role-vertical.png";

const Role = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();

  const [roleUnderstood, setRoleUnderstood] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing confirmation status
  useEffect(() => {
    if (currentUser?.roleUnderstood) {
      setRoleUnderstood(true);
    }
  }, [currentUser]);

  const handleContinue = async () => {
    if (!roleUnderstood) {
      toast({
        title: "Confirmation Required",
        description: "Please acknowledge that you understand your role.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateUserData({
        roleUnderstood: true,
        roleUnderstoodAt: new Date().toISOString(),
        step: 'role'
      });

      if (success) {
        navigate("/availability");
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save acknowledgment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Driver role
        </h2>
        
        <p className="text-center text-base mb-6 max-w-2xl px-4 animate-fade-in">
          As a Laundryheap Partner Driver, you will be responsible for completing a series of essential delivery and collection tasks that ensure smooth daily operations and excellent customer experience. Your main responsibilities include:
        </p>
        
        <div className="w-full max-w-md animate-fade-in mb-6">
          <img 
            src={roleExplanationImage} 
            alt="Role explanation diagram" 
            className="w-full h-auto rounded-lg border-2 border-white mb-8"
          />
          
          <div className="px-4 py-2">
            <CheckboxWithLabel
              label="I understand my role"
              checked={roleUnderstood}
              onChange={setRoleUnderstood}
            />
          </div>
        </div>
        
        <Button 
          onClick={handleContinue}
          className="w-full max-w-xs mt-6"
          disabled={isSaving || isLoading}
        >
          {isSaving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </PageLayout>
  );
};

export default Role;
