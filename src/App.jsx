import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

// Pages
import Welcome from "./pages/Welcome";
import Verify from "./pages/Verify";
import ConfirmDetails from "./pages/ConfirmDetails";
import Introduction from "./pages/Introduction";
import About from "./pages/About";
import Role from "./pages/Role";
import Availability from "./pages/Availability";
import FacilityLocations from "./pages/FacilityLocations";
import Liabilities from "./pages/Liabilities";
import SmokingFitnessCheck from "./pages/SmokingFitnessCheck";
import BlocksClassification from "./pages/BlocksClassification";
import HowRouteWorks from "./pages/HowRouteWorks";
import CancellationPolicy from "./pages/CancellationPolicy";
import FeeStructure from "./pages/FeeStructure";
import PaymentCycleSchedule from "./pages/PaymentCycleSchedule";
import AcknowledgementsSummary from "./pages/AcknowledgementsSummary";
import ThankYou from "./pages/ThankYou";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          {/* Driver routes - AuthProvider only, AdminAuthProvider is disabled */}
          <AuthProvider>
            {/* AdminAuthProvider is nested but will disable itself on non-admin routes */}
            <AdminAuthProvider>
              <Toaster />
              <Sonner />
              <Routes>
                {/* Driver Onboarding Routes */}
                <Route path="/" element={<Welcome />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/confirm-details" element={<ConfirmDetails />} />
                <Route path="/introduction" element={<Introduction />} />
                <Route path="/about" element={<About />} />
                <Route path="/role" element={<Role />} />
                <Route path="/availability" element={<Availability />} />
                <Route path="/facility-locations" element={<FacilityLocations />} />
                <Route path="/liabilities" element={<Liabilities />} />
                <Route path="/smoking-fitness-check" element={<SmokingFitnessCheck />} />
                <Route path="/blocks-classification" element={<BlocksClassification />} />
                <Route path="/fee-structure" element={<FeeStructure />} />
                <Route path="/payment-cycle-schedule" element={<PaymentCycleSchedule />} />
                <Route path="/how-route-works" element={<HowRouteWorks />} />
                <Route path="/cancellation-policy" element={<CancellationPolicy />} />
                <Route path="/acknowledgements-summary" element={<AcknowledgementsSummary />} />
                <Route path="/thank-you" element={<ThankYou />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
                      <AdminDashboard />
                    </AdminProtectedRoute>
                  }
                />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AdminAuthProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
