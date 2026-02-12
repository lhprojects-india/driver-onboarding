
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { acknowledgementServices, feeStructureServices } from "@/lib/firebase-services";
import { getVehicleTypeFromMOT } from "@/lib/utils";
import { pageContent } from "@/data/page-content";
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

const CancellationPolicy = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();

  const [policyUnderstood, setPolicyUnderstood] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currency, setCurrency] = useState('£'); // Default to £ (Birmingham)
  const [city, setCity] = useState(null);
  const { canProceed, timeRemaining } = useMinimumReadTime(30);

  // Cities that should not show the 10% block release fee line
  const citiesWithoutReleaseFee = ['Birmingham', 'Manchester', 'Dublin', 'Copenhagen', 'Amsterdam', 'Edinburgh', 'Miami', 'Boston', 'Chicago'];
  const shouldHideReleaseFee = city && citiesWithoutReleaseFee.some(c => c.toLowerCase() === city.trim().toLowerCase());

  // Fetch currency based on user's city
  useEffect(() => {
    const fetchCurrency = async () => {
      try {
        // Get city from user data (could be from fountainData or city field)
        const userCity = currentUser?.fountainData?.city || currentUser?.city;

        if (!userCity) {
          return;
        }

        setCity(userCity);

        // Extract vehicle type from MOT data (same as FeeStructure page)
        const vehicleType = getVehicleTypeFromMOT(currentUser?.fountainData);

        const structures = await feeStructureServices.getFeeStructuresByCity(userCity, vehicleType);

        if (structures?.currency) {
          setCurrency(structures.currency);
        }
      } catch (error) {
        console.error('❌ Error fetching fee structure for currency:', error);
      }
    };

    if (currentUser) {
      fetchCurrency();
    }
  }, [currentUser]);

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
          {pageContent.cancellationPolicy.title}
        </h2>

        <div className="w-full max-w-2xl animate-fade-in">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-6 max-h-[500px] overflow-y-auto mb-6">
            <div className="text-left space-y-4 text-sm text-gray-900">
              <div className="space-y-4">
                <div>
                  <p className="font-semibold mb-2">{pageContent.cancellationPolicy.rules.fortyEightHour.title}</p>
                  {shouldHideReleaseFee ? (
                    <p className="ml-4">
                      {pageContent.cancellationPolicy.rules.fortyEightHour.noReleaseFee}
                    </p>
                  ) : (
                    <p className="ml-4">
                      {pageContent.cancellationPolicy.rules.fortyEightHour.standard}
                    </p>
                  )}
                  <p className="pt-2 ml-4 text-sm font-bold">
                    {pageContent.cancellationPolicy.rules.fortyEightHour.note}
                  </p>
                </div>

                {!shouldHideReleaseFee && (
                  <div>
                    <p className="font-semibold mb-2">{pageContent.cancellationPolicy.rules.fees.title}</p>
                    <p className="ml-4">{pageContent.cancellationPolicy.rules.fees.standardRelease}</p>
                    <p className="ml-4">
                      {pageContent.cancellationPolicy.rules.fees.standardCancellation}
                    </p>
                  </div>
                )}

                <div>
                  <p className="font-semibold mb-2">{pageContent.cancellationPolicy.rules.example.title}</p>
                  <p className="ml-4 mb-1">
                    {pageContent.cancellationPolicy.rules.example.blockDate.replace('{currency}', currency)}
                  </p>
                  {shouldHideReleaseFee ? (
                    <p className="ml-4">
                      {pageContent.cancellationPolicy.rules.example.noReleaseFee.releasedAfter.replace('{currency}', currency)}
                    </p>
                  ) : (
                    <>
                      <p className="ml-4 mb-1">
                        {pageContent.cancellationPolicy.rules.example.standard.releasedBefore.replace('{currency}', currency)}
                      </p>
                      <p className="ml-4">
                        {pageContent.cancellationPolicy.rules.example.standard.releasedAfter.replace('{currency}', currency)}
                      </p>
                    </>
                  )}
                </div>

                <div>
                  <p className="font-semibold mb-2">{pageContent.cancellationPolicy.rules.whyMatters.title}</p>
                  <p className="ml-4">
                    {pageContent.cancellationPolicy.rules.whyMatters.p1}
                  </p>
                  <p className="pt-2 ml-4">
                    {pageContent.cancellationPolicy.rules.whyMatters.p2}
                    {!shouldHideReleaseFee && pageContent.cancellationPolicy.rules.whyMatters.p2SuffixStandard}
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

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className=" text-white w-full max-w-xs bg-brand-shadePink hover:bg-brand-pink shadow-md hover:shadow-lg"
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
                      className="bg-brand-shadePink hover:bg-brand-pink text-white shadow-md hover:shadow-lg"
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

export default CancellationPolicy;
