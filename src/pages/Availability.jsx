import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import { useSaveProgress } from "@/hooks/useSaveProgress";

const Availability = () => {
  const navigate = useNavigate();
  const { currentUser, saveAvailability, isLoading, isAuthenticated } = useAuth();
  useSaveProgress(); // Automatically save progress when user visits this page
  const [isSaving, setIsSaving] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("Availability Page: Mount/Update", {
      isLoading,
      isAuthenticated,
      hasCurrentUser: !!currentUser,
      email: currentUser?.email
    });
  }, [isLoading, isAuthenticated, currentUser]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !currentUser?.email) {
      console.log("Availability Page: No auth, redirecting to welcome");
      // navigate("/", { replace: true }); // Commented out for now to allow viewing logs
    }
  }, [isLoading, isAuthenticated, currentUser, navigate]);

  const [availability, setAvailability] = useState({
    Mondays: { morning: false, noon: false, evening: false },
    Tuesdays: { morning: false, noon: false, evening: false },
    Wednesdays: { morning: false, noon: false, evening: false },
    Thursdays: { morning: false, noon: false, evening: false },
    Fridays: { morning: false, noon: false, evening: false },
    Saturdays: { morning: false, noon: false, evening: false },
    Sundays: { morning: false, noon: false, evening: false }
  });

  // Load existing availability data
  useEffect(() => {
    if (currentUser?.availability) {
      setAvailability(currentUser.availability);
    }
  }, [currentUser]);

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      const success = await saveAvailability(availability);
      if (success) {
        navigate("/facility-locations");
      }
    } catch (error) {
      console.error("Error saving availability:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvailabilityChange = (newAvailability) => {
    setAvailability(newAvailability);
  };

  // Check if at least one availability slot is selected
  const hasAtLeastOneSelection = () => {
    return Object.values(availability).some(
      (day) => day.morning === true || day.noon === true || day.evening === true
    );
  };

  const isButtonDisabled = !hasAtLeastOneSelection() || isSaving || isLoading;

  return (
    <PageLayout compact title="">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-center text-3xl font-bold mb-6 animate-slide-down">
          Availability Check
        </h2>

        <div className="w-full max-w-lg animate-fade-in">
          <p className="text-center mb-6">
            We offer our blocks in 3 windows: 8 AM - 12 PM, 12 PM - 5 PM, and 5 PM - 10 PM. We are operational 7 days a week.
          </p>

          <p className="text-center mb-6">
            Please share your general availability by making the appropriate selections
          </p>

          <AvailabilityGrid
            availability={availability}
            onAvailabilityChange={handleAvailabilityChange}
          />
        </div>

        {!hasAtLeastOneSelection() && (
          <p className="text-center text-sm text-red-500 mt-4">
            Please select at least one availability slot to continue
          </p>
        )}

        <Button
          onClick={handleContinue}
          className="w-full max-w-xs mt-4 md:mt-8"
          disabled={isButtonDisabled}
        >
          {isSaving ? "Saving..." : "I confirm my weekly availability"}
        </Button>
      </div>
    </PageLayout>
  );
};

export default Availability;
