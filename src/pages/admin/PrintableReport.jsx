import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { driverServices } from "../../lib/firebase-services";
import DriverReport from "../../components/admin/DriverReport";
import { Button } from "../../components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import LaundryheapLogo from "../../assets/logo";

const PrintableReport = () => {
    const { email } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchReportData = async () => {
            if (!email) {
                setError('No email provided');
                setLoading(false);
                return;
            }

            const decodedEmail = decodeURIComponent(email);

            try {
                // Fetch all necessary data to construct the report object
                // This mirrors the logic in AdminDashboard or assumes driverServices.generateReport 
                // can return a comprehensive object or we reconstruct it.
                // Ideally, we should reuse the generateReport logic if it persists the report, 
                // but here we might want to fetch fresh data.

                // Let's try to fetch the latest data directly.
                const [driverData, availabilityData, verificationData] = await Promise.all([
                    driverServices.getDriverData(decodedEmail),
                    driverServices.getAvailability(decodedEmail),
                    driverServices.getVerification(decodedEmail)
                ]);

                if (!driverData) {
                    setError('Driver not found');
                    setLoading(false);
                    return;
                }

                // Construct the report object mirroring AdminDashboard logic
                const app = driverData; // Alias for easier copy-pasting
                const fullReport = {
                    driverEmail: app.email,
                    email: app.email,
                    personalInfo: {
                        name: app.name,
                        email: app.email,
                        phone: app.phone,
                        city: app.city,
                    },
                    driverInfo: {
                        name: app.name,
                        email: app.email,
                        phone: app.phone,
                        city: app.city,
                        vehicleType: app.vehicleType || null,
                        country: app.country,
                    },
                    availability: availabilityData?.availability || app.availability || {},
                    verification: verificationData || app.verification || {},
                    acknowledgements: {
                        role: app.roleUnderstood || app.roleAcknowledged || app?.progress_role?.confirmed || false,
                        roleDate: app.roleUnderstoodAt || app.roleAcknowledgedAt || app?.progress_role?.confirmedAt || (app?.progress_role?.confirmedAt && typeof app.progress_role.confirmedAt.toDate === 'function' ? app.progress_role.confirmedAt.toDate() : null) || null,
                        blockClassification: app.blocksClassificationAcknowledged || false,
                        blockClassificationDate: app.blocksClassificationAcknowledgedAt || (app.blocksClassificationAcknowledgedAt && typeof app.blocksClassificationAcknowledgedAt.toDate === 'function' ? app.blocksClassificationAcknowledgedAt.toDate() : null) || null,
                        feeStructure: app.acknowledgedFeeStructure || app.feeStructureAcknowledged || false,
                        feeStructureDate: app.feeStructureAcknowledgedAt || (app.feeStructureAcknowledgedAt && typeof app.feeStructureAcknowledgedAt.toDate === 'function' ? app.feeStructureAcknowledgedAt.toDate() : null) || null,
                        routesPolicy: app.routesPolicyAcknowledged || false,
                        routesPolicyDate: app.routesPolicyAcknowledgedAt || (app.routesPolicyAcknowledgedAt && typeof app.routesPolicyAcknowledgedAt.toDate === 'function' ? app.routesPolicyAcknowledgedAt.toDate() : null) || null,
                        cancellationPolicy: app.acknowledgedCancellationPolicy || app.cancellationPolicyAcknowledged || false,
                        cancellationPolicyDate: app.cancellationPolicyAcknowledgedAt || (app.cancellationPolicyAcknowledgedAt && typeof app.cancellationPolicyAcknowledgedAt.toDate === 'function' ? app.cancellationPolicyAcknowledgedAt.toDate() : null) || null,
                        liabilities: app.acknowledgedLiabilities || app?.progress_liabilities?.confirmed || false,
                        liabilitiesDate: app.liabilitiesAcknowledgedAt || app?.progress_liabilities?.confirmedAt || (app?.progress_liabilities?.confirmedAt && typeof app.progress_liabilities.confirmedAt.toDate === 'function' ? app.progress_liabilities.confirmedAt.toDate() : null) || null,
                        paymentCycleSchedule: app.acknowledgedPaymentCycleSchedule || app.paymentCycleScheduleAcknowledged || false,
                        paymentCycleScheduleDate: app.paymentCycleScheduleAcknowledgedAt || null
                    },
                    healthAndSafety: {
                        smokingStatus: app.smokingStatus || null,
                        hasPhysicalDifficulties: app.hasPhysicalDifficulties !== undefined ? app.hasPhysicalDifficulties : null,
                        smokingFitnessCompleted: app.progress_smoking_fitness_check?.confirmed === true,
                    },
                    facilityPreferences: {
                        selectedFacilities: app.selectedFacilities || [],
                        acknowledged: app.facilityLocationsAcknowledged || false,
                        acknowledgedAt: app.facilityLocationsAcknowledgedAt || null,
                    },
                    onboardingStatus: app.onboardingStatus,
                    createdAt: app.createdAt,
                    progress: app.progress,
                };

                setReport(fullReport);
            } catch (err) {
                console.error("Error fetching report data:", err);
                setError("Failed to load report data.");
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [email]);

    // Auto-trigger print when data is loaded
    useEffect(() => {
        if (report && !loading) {
            // Small delay to ensure rendering is complete (images, etc)
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [report, loading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                <span className="ml-2">Loading report...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600">
                <h2 className="text-xl font-bold">Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="min-h-screen bg-white printable-report-container">
            {/* Print Header - Visible only on screen or as part of document */}
            <div className="max-w-[210mm] mx-auto p-8 print:p-0">
                <div className="flex justify-between items-center mb-8 print:mb-4">
                    <div className="w-40">
                        {/* Replace with your Logo component or img */}
                        <LaundryheapLogo />
                    </div>
                    <div className="text-right">
                        <h1 className="text-2xl font-bold text-gray-900">Driver Onboarding Report</h1>
                        <p className="text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="print:hidden">
                        <Button onClick={() => window.print()} className="gap-2">
                            <Printer className="h-4 w-4" />
                            Print / Save as PDF
                        </Button>
                    </div>
                </div>

                <DriverReport report={report} />

                <div className="mt-8 text-center text-xs text-gray-400 print:mt-auto print:pt-4">
                    <p>Generated by Laundryheap Driver Onboarding System</p>
                </div>
            </div>
        </div>
    );
};

export default PrintableReport;
