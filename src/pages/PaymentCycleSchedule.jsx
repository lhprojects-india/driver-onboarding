
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PaymentCycleSchedule = () => {
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
    if (currentUser?.paymentCycleScheduleAcknowledged) {
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
        paymentCycleScheduleAcknowledged: true,
        paymentCycleScheduleAcknowledgedAt: now,
        acknowledgedPaymentCycleSchedule: true,
        step: 'payment_cycle_schedule'
      };

      // Attempt server-side immutable acknowledgement
      const res = await acknowledgementServices.acknowledgePaymentCycleSchedule();
      
      // Always update local state regardless of which method was used
      // If user came from summary, return to summary instead of continuing flow
      const shouldReturnToSummary = searchParams.get('from') === 'summary';
      
      if (res.success) {
        // Cloud function succeeded, update local state
        await updateUserData(dataToSave);
        navigate(shouldReturnToSummary ? "/acknowledgements-summary" : "/how-route-works");
      } else {
        // Fallback to client-side write
        const success = await updateUserData(dataToSave);
        if (success) {
          navigate(shouldReturnToSummary ? "/acknowledgements-summary" : "/how-route-works");
        }
      }
    } catch (error) {
      console.error("Error saving payment cycle & schedule acknowledgment:", error);
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
        withdrawalReason: 'Not satisfied with payment cycle & schedule policy',
        step: 'payment_cycle_schedule'
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
          Payment Cycle &amp; Block Schedule
        </h2>
        
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 max-h-[500px] overflow-y-auto mb-6">
            <div className="text-left space-y-6 text-sm text-gray-900">
              <div>
                <p className="font-semibold mb-3 text-base">Payment Cycle</p>
                <div className="ml-4 space-y-2">
                  <p>
                    Payments are processed on a weekly basis. Fees for the blocks you operate in one week are paid in arrears the following week.
                  </p>
                  <p>
                    For example, if you operate blocks between 1 January and 7 January, you will receive the payment breakdown in the following week (8 January to 14 January) by Wednesday, and the payment will be credited to your account by Friday end of day. In some cases, due to banking processing times, the credit may reflect by Monday.
                  </p>
                </div>
              </div>
              
              <div>
                <p className="font-semibold mb-3 text-base">Scheduling</p>
                <div className="ml-4 space-y-2">
                  <p>
                    Blocks are published two weeks in advance. Every Monday at 10:00 AM, we release blocks for the upcoming week.
                  </p>
                  <p>
                    For example, if 1st January falls on a Monday, blocks published on that day will be for the week of 15th January to 20th January.
                  </p>
                  <p>
                    This advance scheduling helps you plan your availability and work schedule upfront.
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
              Please read the payment cycle &amp; schedule policy carefully. You can continue in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}.
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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className=" text-white w-full max-w-xs bg-laundryheap-Red hover:bg-opacity-90"
                    disabled={isSaving || isLoading || isWithdrawing}
                    showArrow={false}
                  >
                    {isWithdrawing ? "Processing..." : "Withdraw my Application"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[200]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Withdraw Application</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to withdraw your application? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleWithdraw}
                      className="bg-laundryheap-Red hover:bg-laundryheap-Red text-white"
                    >
                      Withdraw Application
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default PaymentCycleSchedule;

