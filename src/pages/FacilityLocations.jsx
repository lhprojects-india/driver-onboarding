import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import CheckboxWithLabel from "@/components/CheckboxWithLabel";
import { useToast } from "@/hooks/use-toast";
import { useSaveProgress } from "@/hooks/useSaveProgress";
import { facilityServices } from "@/lib/firebase-services";
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

const FacilityLocations = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();
  useSaveProgress(); // Automatically save progress when user visits this page
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState([]);
  const [cityFacilities, setCityFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  // Fetch facilities based on user's city from database
  useEffect(() => {
    const fetchFacilities = async () => {
      if (!currentUser) {
        setLoadingFacilities(false);
        return;
      }

      // Get city from user data (similar to FeeStructure page)
      const city = currentUser?.fountainData?.city || currentUser?.city;

      if (!city) {
        console.warn('⚠️ No city found in user data');
        setCityFacilities([]);
        setLoadingFacilities(false);
        return;
      }

      setLoadingFacilities(true);
      try {
        const facilities = await facilityServices.getFacilitiesByCity(city);
        
        setCityFacilities(facilities);

        // Load existing facility selections if available
        if (currentUser?.selectedFacilities) {
          setSelectedFacilities(currentUser.selectedFacilities);
        }
      } catch (error) {
        // Error fetching facilities
        setCityFacilities([]);
      } finally {
        setLoadingFacilities(false);
      }
    };

    fetchFacilities();
  }, [currentUser]);

  const handleFacilityToggle = (facilityCode) => {
    setSelectedFacilities(prev => {
      if (prev.includes(facilityCode)) {
        return prev.filter(code => code !== facilityCode);
      } else {
        return [...prev, facilityCode];
      }
    });
  };

  const handleContinue = async () => {
    if (selectedFacilities.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one facility location you're comfortable with.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateUserData({
        selectedFacilities: selectedFacilities,
        facilityLocationsAcknowledged: true,
        facilityLocationsAcknowledgedAt: new Date().toISOString(),
        step: 'facility_locations'
      });

      if (success) {
        navigate("/blocks-classification");
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Unable to save facility selections. Please try again.",
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
        withdrawalReason: 'No comfortable facility locations available',
        step: 'facility_locations'
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
      toast({
        title: "Withdrawal Failed",
        description: "Unable to process withdrawal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Show loading state
  if (loadingFacilities) {
    return (
      <PageLayout compact title="">
        <div className="w-full flex flex-col items-center">
          <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
            Facility Locations
          </h2>
          <div className="w-full max-w-md animate-fade-in">
            <p className="text-center text-muted-foreground">
              Loading facility information...
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Show message if no facilities found
  if (cityFacilities.length === 0 && currentUser && !loadingFacilities) {
    const city = currentUser?.fountainData?.city || currentUser?.city;
    return (
      <PageLayout compact title="">
        <div className="w-full flex flex-col items-center">
          <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
            Facility Locations
          </h2>
          <div className="w-full max-w-md animate-fade-in">
            {city ? (
              <p className="text-center text-muted-foreground">
                No facilities found for {city}. Please contact support.
              </p>
            ) : (
              <p className="text-center text-muted-foreground">
                Unable to load facility information. Please try again.
              </p>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Facility Locations
        </h2>
        
        <div className="w-full max-w-md animate-fade-in">
          <p className="text-center mb-6">
            Please select the facility locations you're comfortable working with in your city.
          </p>
          
          <div className="border border-gray-300 rounded-lg p-4 max-h-[500px] overflow-y-auto mb-6">
            <div className="space-y-4">
              {cityFacilities.map((facility, index) => (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                  <CheckboxWithLabel
                    label={`${facility.Facility} - ${facility.Address}`}
                    checked={selectedFacilities.includes(facility.Facility)}
                    onChange={() => handleFacilityToggle(facility.Facility)}
                  />
                </div>
              ))}
            </div>
          </div>

          {selectedFacilities.length === 0 && (
            <p className="text-center text-sm text-red-500 mt-4">
              Please select at least one facility location to continue
            </p>
          )}
        </div>
        
        <div className="w-full max-w-xs flex flex-col gap-3 mt-4 md:mt-8">
          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={selectedFacilities.length === 0 || isSaving || isLoading || isWithdrawing}
          >
            {isSaving ? "Saving..." : "Continue"}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className=" text-white w-full bg-laundryheap-Red hover:bg-opacity-90"
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
        </div>
      </div>
    </PageLayout>
  );
};

export default FacilityLocations;

