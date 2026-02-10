
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { acknowledgementServices } from "@/lib/firebase-services";
import { pageContent } from "@/data/page-content";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { Button as UIButton } from "@/components/ui/button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";
import { useMinimumReadTime } from "@/hooks/useMinimumReadTime";

const Liabilities = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();

  const [liabilityConfirmed, setLiabilityConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { canProceed, timeRemaining } = useMinimumReadTime(30);

  // Load existing confirmation status
  useEffect(() => {
    if (currentUser?.progress_liabilities) {
      setLiabilityConfirmed(currentUser.progress_liabilities.confirmed || false);
    }
  }, [currentUser]);

  const handleContinue = async () => {
    if (!liabilityConfirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please acknowledge the liability policy.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const dataToSave = {
        progress_liabilities: {
          confirmed: true,
          confirmedAt: now
        },
        acknowledgedLiabilities: true,
        liabilitiesAcknowledgedAt: now,
        step: 'liabilities'
      };

      // Attempt server-side immutable acknowledgement
      const res = await acknowledgementServices.acknowledgeLiabilities();

      // Always update local state regardless of which method was used
      // Liabilities always navigates to summary (whether from summary or normal flow)
      if (res.success) {
        // Cloud function succeeded, update local state
        await updateUserData(dataToSave);
        navigate("/acknowledgements-summary");
      } else {
        // Fallback to client-side write
        const success = await updateUserData(dataToSave);
        if (success) {
          navigate("/acknowledgements-summary");
        }
      }
    } catch (error) {
      console.error("Error saving liability confirmation:", error);
      toast({
        title: "Save Failed",
        description: "Unable to save confirmation. Please try again.",
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
          {pageContent.liabilities.title}
        </h2>

        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-[500px] overflow-y-auto mb-6">
            <div className="text-left space-y-4 text-sm text-gray-900">
              {pageContent.liabilities.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {searchParams.get('from') !== 'summary' && (
            <CheckboxWithLabel
              label="I understand the policy"
              checked={liabilityConfirmed}
              onChange={setLiabilityConfirmed}
            />
          )}
        </div>

        {searchParams.get('from') !== 'summary' && !canProceed && (
          <div className="w-full max-w-md text-center mt-4">
            <p className="text-sm text-muted-foreground">
              Please read the liability policy carefully. You can continue in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}.
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
            <Button
              onClick={handleContinue}
              className="w-full max-w-xs"
              disabled={isSaving || isLoading || !canProceed}
            >
              {isSaving ? "Saving..." : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default Liabilities;
