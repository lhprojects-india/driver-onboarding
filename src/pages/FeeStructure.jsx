
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import { Button as UIButton } from "@/components/ui/button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { feeStructureServices, acknowledgementServices } from "@/lib/firebase-services";
import { getVehicleTypeFromMOT } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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

const FeeStructure = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updateUserData, isLoading, currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [feeStructures, setFeeStructures] = useState(null);
  const [loadingFeeStructures, setLoadingFeeStructures] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [feeStructureAcknowledged, setFeeStructureAcknowledged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Fee structure has more content, so require 45 seconds minimum read time
  const { canProceed, timeRemaining } = useMinimumReadTime(45);

  // Default fee structure (fallback if no city-specific data is found)
  // Using Birmingham as default
  const defaultFeeStructure = {
    city: "Birmingham",
    currency: "£",
    blocks: [
      {
        shiftLength: 4,
        minimumFee: 56,
        includedTasks: 11,
        additionalTaskFee: 5.5,
        density: "medium"
      }
    ],
    averageHourlyEarnings: "£12.50–£18",
    averagePerTaskEarnings: "£4.50–£6.50"
  };

  // Fetch fee structures based on user's city and vehicle type
  useEffect(() => {
    const fetchFeeStructures = async () => {
      try {
        // Get city from user data (could be from fountainData or city field)
        const city = currentUser?.fountainData?.city || currentUser?.city;
        
        // Extract vehicle type from MOT data with debug logging
        const vehicleType = getVehicleTypeFromMOT(currentUser?.fountainData, true);
        
        if (!city) {
          setFeeStructures(defaultFeeStructure);
          setLoadingFeeStructures(false);
          return;
        }

        const structures = await feeStructureServices.getFeeStructuresByCity(city, vehicleType);
        
        // If no structure found for the city, use default
        if (!structures) {
          setFeeStructures(defaultFeeStructure);
        } else {
          // Check if vehicle-specific fees require MOT data (check multiple paths like the helper function)
          if (structures.feeType === 'vehicle-specific') {
            const hasMotData = !!(
              currentUser?.fountainData?.data?.mot ||
              currentUser?.fountainData?.mot ||
              currentUser?.fountainData?.applicant?.data?.mot ||
              currentUser?.fountainData?.vehicle_type ||
              currentUser?.fountainData?.data?.vehicle_type ||
              currentUser?.fountainData?.vehicle
            );
          }
          
          setFeeStructures(structures);
        }
      } catch (error) {
        console.error('❌ Error fetching fee structures:', error);
        setFeeStructures(defaultFeeStructure);
      } finally {
        setLoadingFeeStructures(false);
      }
    };

    // Only fetch if user is authenticated and not loading, and currentUser exists
    if (isAuthenticated && !isLoading && currentUser) {
      fetchFeeStructures();
    } else if (!isLoading && !isAuthenticated) {
      // User is not authenticated and not loading - use default
      setFeeStructures(defaultFeeStructure);
      setLoadingFeeStructures(false);
    }
  }, [currentUser, isLoading, isAuthenticated]);

  // Load existing acknowledgement status
  useEffect(() => {
    if (currentUser?.feeStructureAcknowledged || currentUser?.acknowledgedFeeStructure) {
      setFeeStructureAcknowledged(true);
    }
  }, [currentUser]);

  const handleContinue = async () => {
    if (!feeStructureAcknowledged) {
      toast({
        title: "Confirmation Required",
        description: "Please acknowledge that you understand the fee structure.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const dataToSave = {
        feeStructureAcknowledged: true,
        feeStructureAcknowledgedAt: now,
        acknowledgedFeeStructure: true,
        step: 'fee_structure'
      };

      // Attempt server-side immutable acknowledgement
      const res = await acknowledgementServices.acknowledgeFeeStructure();
      
      // Always update local state regardless of which method was used
      if (res.success) {
        // Cloud function succeeded, update local state
        await updateUserData(dataToSave);
      } else {
        // Fallback to client-side write
        await updateUserData(dataToSave);
      }

      // If user came from summary, return to summary instead of continuing flow
      if (searchParams.get('from') === 'summary') {
        navigate("/acknowledgements-summary");
      } else {
        navigate("/payment-cycle-schedule");
      }
    } catch (error) {
      console.error("Error saving fee structure:", error);
      toast({
        title: "Save Failed",
        description: "Unable to save acknowledgement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToBlocks = () => {
    navigate("/blocks-classification");
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const success = await updateUserData({
        status: 'withdrawn',
        withdrawnAt: new Date().toISOString(),
        withdrawalReason: 'Not satisfied with fee structure',
        step: 'fee_structure'
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

  // Helper function to get currency symbol
  const getCurrency = () => {
    if (!feeStructures) return '£';
    return feeStructures.currency || '£';
  };

  // Helper function to remove trailing '+' from earnings strings
  const cleanEarningsString = (earnings) => {
    if (!earnings || typeof earnings !== 'string') return earnings;
    return earnings.replace(/\+\s*$/, '').trim();
  };

  // Calculate example earnings
  const calculateExample = (block) => {
    if (!block) return null;
    
    const extraTasks = 5;
    const totalTasks = block.includedTasks + extraTasks;
    const extraEarnings = extraTasks * block.additionalTaskFee;
    const totalEarnings = block.minimumFee + extraEarnings;
    
    return {
      extraTasks,
      totalTasks,
      extraEarnings: extraEarnings.toFixed(2),
      totalEarnings: totalEarnings.toFixed(2)
    };
  };

  const currency = getCurrency();
  
  // Get all blocks sorted by density (low, medium, high)
  const getAllBlocks = () => {
    if (!feeStructures?.blocks) return [];
    
    const densityOrder = { 'low': 1, 'medium': 2, 'high': 3 };
    return [...feeStructures.blocks].sort((a, b) => {
      const orderA = densityOrder[a.density] || 999;
      const orderB = densityOrder[b.density] || 999;
      return orderA - orderB;
    });
  };
  
  const allBlocks = getAllBlocks();

  // Loading state
  if (loadingFeeStructures) {
    return (
      <PageLayout compact title="">
        <div className="w-full flex flex-col items-center px-4">
          <h2 className="text-center text-3xl font-bold mb-6">Fee Structure</h2>
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading fee information...</p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center px-4">
        <h2 className="text-center text-3xl font-bold mb-6 animate-fade-in">Fee Structure</h2>

        <div className="grid w-full max-w-4xl gap-6">
          <Card>
            <CardHeader>
              <CardTitle>How your pay works</CardTitle>
              <CardDescription>
                Clear minimums, predictable extras, and transparent examples.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Every delivery block (3, 4, or 5 hours) comes with a <strong>guaranteed minimum fee</strong>.
              </p>
              <p>
                Even if there are fewer tasks on a given day, you&apos;ll still receive this full minimum amount.
              </p>
              <p>
                If you complete more than the included number of tasks, you&apos;ll earn extra pay for each additional task — the busier it is, the more you earn.
              </p>
              <p className="font-medium">
                Only successfully completed tasks count toward your pay. Tasks that are failed or not delivered/picked up are not paid.
              </p>
            </CardContent>
          </Card>

          {/* Block overview intentionally omitted as requested */}

          {allBlocks.length > 0 ? (
            <>
              <div className="col-span-full">
                <h3 className="text-xl font-semibold mb-4">Examples by Density</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  See how minimum + extra tasks add up for different route densities.
                </p>
              </div>
              
              {allBlocks.map((block, index) => {
                const example = calculateExample(block);
                const densityColors = {
                  'low': 'border-blue-200',
                  'medium': 'border-yellow-200',
                  'high': 'border-green-200'
                };
                const borderColor = densityColors[block.density] || 'border-blue-200';
                
                return (
                  <Card key={index} className={borderColor}>
                    <CardHeader>
                      <CardTitle className="capitalize">
                        {block.density ? `${block.density} Density` : 'Standard'} - {block.shiftLength}-hour block
                      </CardTitle>
                      <CardDescription>See how minimum + extra tasks add up.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="rounded-md border p-4">
                          <div className="text-sm text-muted-foreground">Minimum fee</div>
                          <div className="text-2xl font-semibold">{currency}{block.minimumFee}</div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-sm text-muted-foreground">Included tasks</div>
                          <div className="text-2xl font-semibold">{block.includedTasks}</div>
                        </div>
                        <div className="rounded-md border p-4">
                          <div className="text-sm text-muted-foreground">Extra per task</div>
                          <div className="text-2xl font-semibold">{currency}{block.additionalTaskFee}</div>
                        </div>
                      </div>
                      {example && (
                        <div className="rounded-md bg-muted border p-4">
                          <p>
                            If you complete <strong>{example.totalTasks} tasks</strong> ({example.extraTasks} extra × {currency}{block.additionalTaskFee}), your total becomes
                            {" "}
                            <strong className="text-yellow-200">{currency}{example.totalEarnings}</strong>.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>What to expect</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-md border p-4">
                <span className="font-medium">Guaranteed minimum:</span> You&apos;re always paid for the block you commit to.
              </div>
              <div className="rounded-md border p-4">
                <span className="font-medium">Extra earnings:</span> More tasks = more pay.
              </div>
              <div className="rounded-md border p-4">
                <span className="font-medium">Average hourly earnings:</span> {cleanEarningsString(feeStructures?.averageHourlyEarnings) || '£14–£20'}
              </div>
              <div className="rounded-md border p-4">
                <span className="font-medium">Average per-task earnings:</span> {cleanEarningsString(feeStructures?.averagePerTaskEarnings) || '£4.50–£6.50'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-300">
            <CardContent className="p-6">
              <p>
                💡 You&apos;re always covered with a <strong>guaranteed minimum fee</strong> — and any extra work means extra income on top of that.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="w-full flex flex-col items-center mt-8 md:mt-10">
          {searchParams.get('from') !== 'summary' && (
            <div className="w-full max-w-md text-center mb-6">
              <p className="text-sm text-muted-foreground mb-2">Want to revisit the block classes?</p>
              <button
                onClick={handleBackToBlocks}
                className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                disabled={isLoading}
              >
                Back to Block Classification
              </button>
            </div>
          )}

          {searchParams.get('from') !== 'summary' && (
            <div className="w-full max-w-2xl mb-6">
              <CheckboxWithLabel
                label="I'm happy with the fee structure"
                checked={feeStructureAcknowledged}
                onChange={setFeeStructureAcknowledged}
              />
            </div>
          )}

          {searchParams.get('from') !== 'summary' && !canProceed && (
            <div className="w-full max-w-xl text-center mb-4">
              <p className="text-sm text-muted-foreground">
                Please read the fee structure carefully. You can continue in {timeRemaining} second{timeRemaining !== 1 ? 's' : ''}.
              </p>
            </div>
          )}
          {searchParams.get('from') === 'summary' ? (
            <div className="w-full max-w-xl mb-4">
              <UIButton
                onClick={() => navigate("/acknowledgements-summary")}
                className="w-full"
                variant="outline"
                disabled={isLoading || loadingFeeStructures}
              >
                Back to Summary
              </UIButton>
            </div>
          ) : (
            <div className="flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={handleContinue}
                className="w-full sm:w-auto"
                disabled={isSaving || isLoading || loadingFeeStructures || !canProceed || !feeStructureAcknowledged}
              >
                {isSaving ? "Saving..." : "Continue"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className=" text-white w-full sm:w-auto bg-brand-shadePink hover:bg-brand-pink shadow-md hover:shadow-lg"
                    disabled={isSaving || isLoading || loadingFeeStructures || isWithdrawing}
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
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default FeeStructure;
