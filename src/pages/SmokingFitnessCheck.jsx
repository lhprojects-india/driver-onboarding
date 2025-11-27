import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { Button as UIButton } from "@/components/ui/button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";
import { useMinimumReadTime } from "@/hooks/useMinimumReadTime";

const SmokingFitnessCheck = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();

  const [smokingPolicy, setSmokingPolicy] = useState("");
  const [physicalFitness, setPhysicalFitness] = useState(null); // null = not selected, true = can climb, false = cannot climb
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { canProceed, timeRemaining } = useMinimumReadTime(30);

  // Load existing data
  useEffect(() => {
    if (currentUser) {
      setSmokingPolicy(currentUser.smokingStatus || "");
      if (currentUser.hasPhysicalDifficulties !== undefined) {
        setPhysicalFitness(!currentUser.hasPhysicalDifficulties);
      }
    }
  }, [currentUser]);

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const success = await updateUserData({
        status: 'withdrawn',
        withdrawnAt: new Date().toISOString(),
        withdrawalReason: 'Cannot climb stairs - physical fitness requirement not met',
        step: 'smoking_fitness_check'
      });

      if (success) {
        navigate("/thank-you");
      } else {
        toast({
          title: "Withdrawal Failed",
          description: "Unable to process withdrawal. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error withdrawing application:", error);
      toast({
        title: "Withdrawal Failed",
        description: "Unable to process withdrawal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleContinue = async () => {
    if (!smokingPolicy) {
      toast({
        title: "Selection Required",
        description: "Please select your smoking status.",
        variant: "destructive",
      });
      return;
    }

    if (physicalFitness === null) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm your physical fitness status.",
        variant: "destructive",
      });
      return;
    }

    if (physicalFitness === false) {
      // If they cannot climb stairs, they should withdraw
      handleWithdraw();
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateUserData({
        smokingStatus: smokingPolicy,
        hasPhysicalDifficulties: !physicalFitness,
        step: 'smoking_fitness_check'
      });

      if (success) {
        navigate("/liabilities");
      }
    } catch (error) {
      console.error("Error saving smoking/fitness data:", error);
      toast({
        title: "Save Failed",
        description: "Unable to save information. Please try again.",
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
          Smoking habits policy / Physical fitness check
        </h2>
        
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div>
            <h3 className="text-xl font-semibold mb-4">Smoking habits policy</h3>
            
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mb-6">
              <div className="text-left space-y-3 text-sm text-gray-900">
                <p>
                  Please note that we strictly advise all partner drivers to handle customer orders with the utmost care. Smoking inside the vehicle is strictly prohibited, as it can cause the orders to absorb a smoke smell, which negatively affects the customer experience.
                </p>
                <p>
                  If you feel the urge to smoke, please step outside the vehicle and ensure you are far enough away so that the smoke does not enter the vehicle from the outside.
                </p>
                <p>
                  Also, please make sure to wash and sanitize your hands before you start your block.
                </p>
                <p>
                  Kindly note that if we receive customer feedback regarding a smoke smell on the orders, the partner driver will be held liable for any compensation required. In addition, their access to the platform may be revoked, as such incidents severely impact customer satisfaction and brand standards.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <CheckboxWithLabel
                label="I don't smoke"
                checked={smokingPolicy === "non-smoker"}
                onChange={() => setSmokingPolicy("non-smoker")}
              />
              <CheckboxWithLabel
                label="I smoke but I understand the policy"
                checked={smokingPolicy === "smoker-understands"}
                onChange={() => setSmokingPolicy("smoker-understands")}
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-semibold mb-4">Physical fitness check</h3>
            
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 mb-6">
              <div className="text-left space-y-3 text-sm text-gray-900">
                <p>
                  Please note that drivers may encounter situations where they need to climb stairs to deliver orders to different floors when elevator facilities are not available.
                </p>
                <p>
                  We need to verify that you are physically capable of handling such situations without difficulty, as this is essential for completing deliveries to all customer locations.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <CheckboxWithLabel
                label="I can climb stairs and have no physical difficulties that would prevent me from delivering to different floors"
                checked={physicalFitness === true}
                onChange={() => setPhysicalFitness(true)}
              />
              <CheckboxWithLabel
                label="I cannot climb stairs"
                checked={physicalFitness === false}
                onChange={() => setPhysicalFitness(false)}
              />
            </div>
          </div>
        </div>
        
        {!canProceed && (
          <div className="w-full max-w-md text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Please read the policies carefully. You can continue in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
        
        {physicalFitness === false ? (
          <div className="w-full flex flex-col items-center space-y-4 mt-6">
            <p className="text-sm text-gray-600 text-center max-w-md">
              If you cannot climb stairs, you will need to withdraw your application as this is a requirement for the role.
            </p>
            <Button
              onClick={handleWithdraw}
              className=" text-white w-full max-w-xs bg-laundryheap-Red hover:bg-opacity-90"
              disabled={isSaving || isLoading || isWithdrawing}
              showArrow={false}
            >
              {isWithdrawing ? "Processing..." : "Withdraw my Application"}
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleContinue}
            className="w-full max-w-xs mt-6"
            disabled={isSaving || isLoading || !canProceed}
          >
            {isSaving ? "Saving..." : "Continue"}
          </Button>
        )}
      </div>
    </PageLayout>
  );
};

export default SmokingFitnessCheck;
