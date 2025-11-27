
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { acknowledgementServices } from "@/lib/firebase-services";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { Button as UIButton } from "@/components/ui/button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";
import { useMinimumReadTime } from "@/hooks/useMinimumReadTime";

const CancellationPolicy = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();

  const [policyUnderstood, setPolicyUnderstood] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { canProceed, timeRemaining } = useMinimumReadTime(30);

  // Load existing confirmation status
  useEffect(() => {
    if (currentUser?.cancellationPolicyAcknowledged) {
      setPolicyUnderstood(true);
    }
  }, [currentUser]);

  const handleContinue = async () => {
    if (!policyUnderstood) {
      toast({
        title: "Confirmation Required",
        description: "Please acknowledge that you understand the policy.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const dataToSave = {
        cancellationPolicyAcknowledged: true,
        cancellationPolicyAcknowledgedAt: now,
        acknowledgedCancellationPolicy: true,
        step: 'cancellation_policy'
      };

      // Attempt server-side immutable acknowledgement
      const res = await acknowledgementServices.acknowledgeCancellationPolicy();
      
      // Always update local state regardless of which method was used
      // If user came from summary, return to summary instead of continuing flow
      const shouldReturnToSummary = searchParams.get('from') === 'summary';
      
      if (res.success) {
        // Cloud function succeeded, update local state
        await updateUserData(dataToSave);
        navigate(shouldReturnToSummary ? "/acknowledgements-summary" : "/smoking-fitness-check");
      } else {
        // Fallback to client-side write
        const success = await updateUserData(dataToSave);
        if (success) {
          navigate(shouldReturnToSummary ? "/acknowledgements-summary" : "/smoking-fitness-check");
        }
      }
    } catch (error) {
      console.error("Error saving cancellation policy acknowledgment:", error);
      toast({
        title: "Save Failed",
        description: "Unable to save acknowledgment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const success = await updateUserData({
        status: 'withdrawn',
        withdrawnAt: new Date().toISOString(),
        withdrawalReason: 'Not satisfied with cancellation policy',
        step: 'cancellation_policy'
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

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Cancelling a Block – What You Need to Know
        </h2>
        
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 max-h-[500px] overflow-y-auto mb-6">
            <div className="text-left space-y-4 text-sm text-gray-900">
              <p className="font-medium">
                Thinking about cancelling a block? Here's how to stay on track and avoid extra fees:
              </p>
              
              <div className="space-y-3">
                <div>
                  <p className="font-semibold">🔹 The 48-Hour Rule</p>
                  <p className="ml-6">
                    You must release a block at least 48 hours before it starts.
                  </p>
                  <p className="ml-6">
                    If not, it will be counted as a last-minute cancellation.
                  </p>
                </div>
                
                <div>
                  <p className="font-semibold">🔹 What Happens if You Miss the Deadline?</p>
                  <p className="ml-6">
                    A cancellation fee will apply, and this will be your full block fee as per Laundryheap's policy.
                  </p>
                </div>
                
                <div>
                  <p className="font-semibold">🔹 Releasing on Time Saves You Money</p>
                  <p className="ml-6">
                    If you release the block more than 48 hours in advance, you'll only be charged a 10% block release fee and not the entire block fee.
                  </p>
                </div>
                
                <div>
                  <p className="font-semibold">🔹 Example — Simple and Clear</p>
                  <p className="ml-6">
                    You've picked a block for 16th January at 5:00 PM.
                  </p>
                  <p className="ml-6">
                    To avoid the full fee, you need to release it before 5:00 PM on 14th January.
                  </p>
                  <p className="ml-6">
                    That's your 48-hour window!
                  </p>
                </div>
                
                <div>
                  <p className="font-semibold">🔹 Why This Matters</p>
                  <p className="ml-6">
                    Releasing blocks early helps the team reassign the slot smoothly, ensuring customers receive consistent service — and it helps everyone avoid unnecessary delays.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {searchParams.get('from') !== 'summary' && (
            <CheckboxWithLabel
              label="I understand the policy"
              checked={policyUnderstood}
              onChange={setPolicyUnderstood}
            />
          )}
        </div>
        
        {searchParams.get('from') !== 'summary' && !canProceed && (
          <div className="w-full max-w-md text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Please read the cancellation policy carefully. You can continue in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
        
        <div className="w-full flex flex-col items-center space-y-4 mt-6">
          {searchParams.get('from') === 'summary' ? (
            <UIButton
              onClick={() => navigate("/acknowledgements-summary")}
              className="w-full max-w-xs"
              variant="outline"
              disabled={isSaving || isLoading}
            >
              Back to Summary
            </UIButton>
          ) : (
            <>
              <Button
                onClick={handleContinue}
                className="w-full max-w-xs"
                disabled={isSaving || isLoading || !canProceed}
              >
                {isSaving ? "Saving..." : "Continue"}
              </Button>

              <Button
                onClick={handleWithdraw}
                className=" text-white w-full max-w-xs bg-laundryheap-Red hover:bg-opacity-90"
                disabled={isSaving || isLoading || isWithdrawing}
                showArrow={false}
              >
                {isWithdrawing ? "Processing..." : "Withdraw my Application"}
              </Button>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default CancellationPolicy;
