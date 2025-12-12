import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { Button as UIButton } from "@/components/ui/button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

const AcknowledgementsSummary = () => {
  const navigate = useNavigate();
  const { currentUser, completeOnboarding, isLoading } = useAuth();
  const { toast } = useToast();

  const [allPoliciesUnderstood, setAllPoliciesUnderstood] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Define all acknowledgements with their routes and titles
  const acknowledgements = [
    {
      id: 'liabilities',
      title: 'Liability Policy',
      route: '/liabilities',
      isAcknowledged: () => {
        return currentUser?.progress_liabilities?.confirmed || 
               currentUser?.acknowledgedLiabilities || 
               currentUser?.liabilitiesAcknowledged;
      }
    },
    {
      id: 'blocks-classification',
      title: 'Blocks Classification',
      route: '/blocks-classification',
      isAcknowledged: () => currentUser?.blocksClassificationAcknowledged
    },
    {
      id: 'fee-structure',
      title: 'Fee Structure',
      route: '/fee-structure',
      isAcknowledged: () => {
        return currentUser?.feeStructureAcknowledged || 
               currentUser?.acknowledgedFeeStructure;
      }
    },
    {
      id: 'how-route-works',
      title: 'Routes and Task Addition',
      route: '/how-route-works',
      isAcknowledged: () => currentUser?.routesPolicyAcknowledged
    },
    {
      id: 'cancellation-policy',
      title: 'Cancellation Policy',
      route: '/cancellation-policy',
      isAcknowledged: () => {
        return currentUser?.cancellationPolicyAcknowledged || 
               currentUser?.acknowledgedCancellationPolicy;
      }
    }
  ];

  // Count how many acknowledgements have been completed
  const completedAcknowledgements = acknowledgements.filter(ack => ack.isAcknowledged());
  const allAcknowledged = completedAcknowledgements.length === acknowledgements.length;

  const handleReviewPolicy = (route) => {
    navigate(`${route}?from=summary`);
  };

  const handleFinish = async () => {
    if (!allPoliciesUnderstood) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you understand all policies before completing onboarding.",
        variant: "destructive",
      });
      return;
    }

    setIsCompleting(true);
    try {
      // Complete onboarding
      const success = await completeOnboarding();
      if (success) {
        navigate("/thank-you");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Completion Failed",
        description: "Unable to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center px-4">
        <div className="w-full max-w-3xl space-y-6 animate-fade-in">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">
              Review Your Acknowledgements
            </h2>
            <p className="text-lg text-muted-foreground mb-2">
            After completing this application, you will move on to an automated interview.
            </p>
            <p className="text-base text-muted-foreground mb-6">
            It will include questions based on the policies you've reviewed. If you want to review anything, now is a good time.
            </p>
          </div>

          <Card className="!bg-gray-50/50 border-gray-300">
            <CardHeader>
              <CardTitle>Completed Acknowledgements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {acknowledgements.map((ack) => {
                  const isCompleted = ack.isAcknowledged();
                  return (
                    <div
                      key={ack.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        isCompleted ? 'bg-transparent border-green-300' : 'bg-transparent border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                        <span className={`font-medium ${isCompleted ? 'text-green-900' : 'text-gray-700'}`}>
                          {ack.title}
                        </span>
                      </div>
                      <UIButton
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewPolicy(ack.route)}
                        className="ml-4"
                      >
                        Review
                      </UIButton>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Completed: {completedAcknowledgements.length} of {acknowledgements.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-6">
              <div className="text-base font-medium">
                <CheckboxWithLabel
                  label="I understand all the policies and am ready for the AI call"
                  checked={allPoliciesUnderstood}
                  onChange={setAllPoliciesUnderstood}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col items-center space-y-4 pt-4">
            <Button
              onClick={handleFinish}
              className="w-full max-w-xs"
              disabled={isCompleting || isLoading || !allPoliciesUnderstood}
            >
              {isCompleting || isLoading ? "Completing..." : "Finish Onboarding"}
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AcknowledgementsSummary;

