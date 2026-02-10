
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { pageContent } from "@/data/page-content";
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
      console.error("Error saving blocks classification acknowledgment:", error);
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
          {pageContent.blocksClassification.title}
        </h2>

        <div className="w-full max-w-md animate-fade-in">
          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 max-h-[500px] overflow-y-auto mb-6">
            <div className="text-left space-y-4 text-sm text-gray-900">
              <p>{pageContent.blocksClassification.intro}</p>

              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>
                      {pageContent.blocksClassification.table.high.label}
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px' }}>
                      {pageContent.blocksClassification.table.high.desc}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>
                      {pageContent.blocksClassification.table.medium.label}
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px' }}>
                      {pageContent.blocksClassification.table.medium.desc}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>
                      {pageContent.blocksClassification.table.low.label}
                    </td>
                    <td style={{ border: '1px solid black', padding: '8px' }}>
                      {pageContent.blocksClassification.table.low.desc}
                    </td>
                  </tr>
                </tbody>
              </table>

              {pageContent.blocksClassification.footer.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
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
