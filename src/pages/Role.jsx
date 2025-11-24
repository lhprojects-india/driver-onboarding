
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";

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
      console.error("Error saving role acknowledgment:", error);
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
        
        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-[500px] overflow-y-auto mb-6">
            <div className="text-left space-y-4 text-sm text-gray-900">
              <p>
                As a Laundryheap Partner Driver, you will be responsible for completing a series of essential delivery and collection tasks that ensure smooth daily operations and excellent customer experience. Your main responsibilities include:
              </p>
              
              <div>
                <p className="font-semibold">1. Facility Pick-Up</p>
                <p>
                  Your route begins at one of our Laundryheap facilities, where you will collect processed items in bags and hangers that are ready to be delivered to customers. Ensure that all items are correctly scanned and securely loaded into your vehicle.
                </p>
              </div>
              
              <div>
                <p className="font-semibold">2. Customer Delivery</p>
                <p>
                  Deliver the collected items directly to customers' addresses. Accuracy, professionalism, and punctuality are key — our goal is to provide every customer with a seamless and reliable delivery experience.
                </p>
              </div>
              
              <div>
                <p className="font-semibold">3. Customer Pick-Up</p>
                <p>
                  While on your route, you will also collect unprocessed laundry items from customers. These items must be properly tagged, scanned, and handled with care before being transported back to the facility.
                </p>
              </div>
              
              <div>
                <p className="font-semibold">4. Facility Drop-Off</p>
                <p>
                  At the end of your route, return to the facility to drop off all collected (unprocessed) items. This step completes the service cycle and ensures items are ready for processing.
                </p>
              </div>
            </div>
          </div>
          
          <CheckboxWithLabel
            label="I understand my role"
            checked={roleUnderstood}
            onChange={setRoleUnderstood}
          />
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
