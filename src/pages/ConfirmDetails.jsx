import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/PageLayout";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle } from "lucide-react";

const ConfirmDetails = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserData, isLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Get data from Fountain (stored after phone verification)
  const fountainData = currentUser?.fountainData || {};
  
  // State for display fields - pre-filled from Fountain data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [vehicleType, setVehicleType] = useState("");

  // Load Fountain data when component mounts or currentUser changes
  useEffect(() => {
    if (currentUser) {
      // Try to get data from fountainData first, then fall back to currentUser properties
      setName(fountainData.name || currentUser.name || "");
      setEmail(currentUser.email || "");
      setPhone(fountainData.phone || currentUser.phone || "");
      setCity(fountainData.city || currentUser.city || "");
      setVehicleType(fountainData.vehicleType || currentUser.vehicleType || "");
    }
  }, [currentUser, fountainData]);

  const handleConfirm = async () => {
    // Validate required fields
    if (!name || !email || !phone || !city) {
      toast({
        title: "Incomplete data",
        description: "Some required fields are missing. Please report this issue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const dataToUpdate = {
        name,
        phone,
        city,
        step: 'confirm_details',
        detailsConfirmed: true,
        detailsConfirmedAt: new Date().toISOString(),
        progress_confirm_details: { confirmed: true, confirmedAt: new Date().toISOString() }
      };

      // Only include vehicle type if it was provided
      if (vehicleType) {
        dataToUpdate.vehicleType = vehicleType;
      }

      const success = await updateUserData(dataToUpdate);

      if (success) {
        toast({
          title: "Details confirmed",
          description: "Your information has been confirmed.",
        });
        navigate("/introduction");
      }
    } catch (error) {
      // Error handling is done via toast notifications
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReportIssue = async () => {
    setIsProcessing(true);
    try {
      const conflictReport = {
        reportType: 'Applicant Info Conflict',
        reportedAt: new Date().toISOString(),
        fountainData: {
          name,
          email,
          phone,
          city,
          vehicleType
        },
        status: 'pending_review',
        step: 'personal_details'
      };

      const success = await updateUserData(conflictReport);

      if (success) {
        toast({
          title: "Issue reported",
          description: "Your data conflict has been reported. Our team will review and contact you shortly.",
        });
        
        // Navigate to a waiting/info page or stay on current page
        navigate("/introduction");
      }
    } catch (error) {
      toast({
        title: "Report failed",
        description: "Unable to submit your report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageLayout title="Confirm your details">
      <div className="w-full flex flex-col items-center space-y-6">
        <div className="text-center mb-2">
          <p className="text-sm text-gray-600">
            Please review and confirm your details from your Fountain application.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            If any information is incorrect, please report an issue and our team will assist you.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              placeholder="Your full name"
              type="text"
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <Input
              value={email}
              placeholder="your.email@example.com"
              type="email"
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <Input
              value={phone}
              placeholder="+353 12 345 6789"
              type="tel"
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <Input
              value={city}
              placeholder="Dublin"
              type="text"
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>

          {vehicleType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type
              </label>
              <Input
                value={vehicleType}
                placeholder="e.g., Car, Bike, Van"
                type="text"
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
          )}
        </div>

        <div className="w-full max-w-xs space-y-3 mt-6">
          <Button
            onClick={handleConfirm}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isProcessing || isLoading}
          >
            <CheckCircle size={18} />
            {isProcessing ? "Processing..." : "Confirm & Continue"}
          </Button>

          <Button
            onClick={handleReportIssue}
            variant="outline"
            className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
            disabled={isProcessing || isLoading}
          >
            <AlertCircle size={18} />
            Report Issue with Details
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 max-w-xs mt-4">
          By confirming, you verify that all the information displayed above is accurate and matches your Fountain application.
        </p>
      </div>
    </PageLayout>
  );
};

export default ConfirmDetails;
