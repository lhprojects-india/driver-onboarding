
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { Button as UIButton } from "@/components/ui/button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";

const BlocksClassification = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();

  const [policyUnderstood, setPolicyUnderstood] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing confirmation status
  useEffect(() => {
    if (currentUser?.blocksClassificationAcknowledged) {
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
      const success = await updateUserData({
        blocksClassificationAcknowledged: true,
        blocksClassificationAcknowledgedAt: new Date().toISOString(),
        step: 'blocks_classification'
      });

      if (success) {
        // If user came from summary, return to summary instead of continuing flow
        if (searchParams.get('from') === 'summary') {
          navigate("/acknowledgements-summary");
        } else {
          navigate("/fee-structure");
        }
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
          Block densities
        </h2>

        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-[500px] overflow-y-auto mb-6">
            <div className="text-left space-y-4 text-sm text-gray-900">
              <p>
                Our fee structure is designed to ensure fair compensation for our partner drivers by basing fees on tasks completed rather than on hourly rates. To better accommodate varying workloads, blocks are classified into:
              </p>

              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>
                      High Task Density
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px' }}>
                      higher number of tasks with lower driving distance
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>
                      Medium Task Density
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px' }}>
                      balanced route of tasks and distance
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>
                      Low Task Density
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px' }}>
                      lower number of tasks and higher driving distance
                    </td>
                  </tr>
                </tbody>
              </table>

              <p>Each block attracts a different guaranteed fee, along with a minimum number of tasks that need to be completed and a fee for any additional tasks.
              </p>
              <p>All details of the fee can be viewed in the Laundryheap Driver Application.</p>
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
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Saving..." : "Continue"}
            </Button>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default BlocksClassification;
