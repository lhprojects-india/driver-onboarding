import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { CheckCircle, XCircle, Users, MapPin, AlertTriangle } from 'lucide-react';


const getOnboardingStatusBadge = (status) => {
    const statusConfig = {
        started: { variant: "secondary", label: "In Progress" },
        completed: { variant: "default", label: "Completed" },
    };

    const config = statusConfig[status] || statusConfig.started;

    return (
        <Badge variant={config.variant}>
            {config.label}
        </Badge>
    );
};
// Constants if not readily available
const DAYS_ORDER_LOCAL = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

const DriverReport = ({ report }) => {
    if (!report) return null;

    // Helper for formatting date
    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            // Handle Firestore Timestamp
            if (date && typeof date.toDate === 'function') {
                return date.toDate().toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            }
            // Handle serialised timestamp
            if (date && typeof date === 'object' && date.seconds) {
                return new Date(date.seconds * 1000).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });
            }
            // Handle standard Date object or string
            return new Date(date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            console.error('Date formatting error', e);
            return String(date);
        }
    };

    // Helper for timestamps with time
    const formatDateTime = (date) => {
        if (!date) return '';
        try {
            const d = date && typeof date.toDate === 'function' ? date.toDate() : new Date(date);
            return d.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '';
        }
    };


    return (
        <div className="space-y-6">
            {/* Application Summary */}
            <Card className="bg-gradient-to-r from-brand-lightBlue to-white border-brand-lightBlue print:border-gray-200 print:shadow-none">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-brand-blue print:text-black" />
                        Application Summary
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {report.reportId && (
                            <div>
                                <span className="text-gray-600 font-semibold">Report ID:</span>
                                <span className="ml-2 font-mono text-xs">{report.reportId}</span>
                            </div>
                        )}
                        <div>
                            <span className="text-gray-600 font-semibold">Email:</span>
                            <span className="ml-2 font-medium">{report.driverEmail || report.email || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-gray-600 font-semibold">Onboarding Status:</span>
                            <span className="ml-2 inline-block">{getOnboardingStatusBadge(report.onboardingStatus || 'started')}</span>
                        </div>
                        {report.createdAt && (
                            <div>
                                <span className="text-gray-600 font-semibold">Created:</span>
                                <span className="ml-2 font-medium">{formatDate(report.createdAt)}</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Driver Information */}
            {(report.driverInfo || report.personalInfo) && (
                <Card className="print:shadow-none print:border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Driver Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(report.driverInfo || report.personalInfo || {}).map(([key, value]) => (
                                <div key={key}>
                                    <strong className="capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong>{' '}
                                    <span className="ml-1">{value ? String(value) : 'N/A'}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Availability */}
            {report.availability && (
                <Card className="print:shadow-none print:border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Availability Schedule</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 print:bg-gray-100">
                                        <TableHead className="font-semibold text-gray-900">Day</TableHead>
                                        <TableHead className="font-semibold text-center text-gray-900">AM</TableHead>
                                        <TableHead className="font-semibold text-center text-gray-900">PM</TableHead>
                                        <TableHead className="font-semibold text-center text-gray-900">NGT</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {DAYS_ORDER_LOCAL.filter(day => report.availability[day]).map((day) => {
                                        const slots = report.availability[day];
                                        return (
                                            <TableRow key={day} className="hover:bg-gray-50 print:border-b">
                                                <TableCell className="font-medium capitalize">{day}</TableCell>
                                                <TableCell className="text-center">
                                                    {slots.morning ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 font-medium print:text-black">
                                                            <CheckCircle className="h-4 w-4 print:text-black" />
                                                            <span className="print:font-bold">Yes</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 print:text-gray-400">
                                                            <XCircle className="h-4 w-4" />
                                                            No
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {slots.noon ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 font-medium print:text-black">
                                                            <CheckCircle className="h-4 w-4 print:text-black" />
                                                            <span className="print:font-bold">Yes</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 print:text-gray-400">
                                                            <XCircle className="h-4 w-4" />
                                                            No
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {slots.evening ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 font-medium print:text-black">
                                                            <CheckCircle className="h-4 w-4 print:text-black" />
                                                            <span className="print:font-bold">Yes</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 print:text-gray-400">
                                                            <XCircle className="h-4 w-4" />
                                                            No
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Verification */}
            {(report.verification || report.verificationDetails) && (
                <Card className="print:shadow-none print:border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Verification Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(report.verification || report.verificationDetails || {}).map(([key, value]) => {
                                if (key.includes('At') || key === 'email' || key === 'createdAt' || key === 'updatedAt') {
                                    return null;
                                }
                                return (
                                    <div key={key}>
                                        <strong className="capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong>{' '}
                                        <span>{value ? String(value) : 'N/A'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Facility Preferences */}
            {report.facilityPreferences && (
                <Card className="print:shadow-none print:border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Facility Preferences
                        </CardTitle>
                        <CardDescription>Facility locations the driver is comfortable working with</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {report.facilityPreferences.selectedFacilities && report.facilityPreferences.selectedFacilities.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                        Selected Facilities ({report.facilityPreferences.selectedFacilities.length}):
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {report.facilityPreferences.selectedFacilities.map((facility, index) => (
                                            <Badge key={index} variant="outline" className="text-sm print:border-gray-400 print:text-black">
                                                {facility}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500 italic">
                                    No facilities selected
                                </div>
                            )}

                            <div className="pt-2 border-t flex items-center justify-end gap-2 print:justify-start">
                                <span className="font-semibold text-sm">Acknowledgement Status:</span>
                                <Badge variant={report.facilityPreferences.acknowledged ? "default" : "secondary"}
                                    className={report.facilityPreferences.acknowledged ? "bg-green-600 print:bg-white print:text-black print:border-black" : ""}>
                                    {report.facilityPreferences.acknowledged ? 'Completed' : 'Pending'}
                                </Badge>
                                {report.facilityPreferences.acknowledgedAt && (
                                    <span className="text-xs text-gray-500">
                                        {formatDateTime(report.facilityPreferences.acknowledgedAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Health & Safety */}
            {report.healthAndSafety && (report.healthAndSafety.smokingStatus || report.healthAndSafety.smokingFitnessCompleted || report.healthAndSafety.hasPhysicalDifficulties !== null) && (
                <Card className="print:shadow-none print:border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Health & Safety</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {report.healthAndSafety.smokingStatus && (
                                <div className="p-3 rounded-lg border bg-gray-50 print:bg-white print:border-gray-300">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center print:bg-gray-100">
                                            <Users className="h-5 w-5 text-blue-600 print:text-black" />
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-medium">Smoking Status</span>
                                            <p className="text-sm text-gray-600 mt-0.5">
                                                {report.healthAndSafety.smokingStatus === 'non-smoker'
                                                    ? "Non-smoker"
                                                    : "Smoker - Understands policy"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {report.healthAndSafety.hasPhysicalDifficulties !== null && report.healthAndSafety.hasPhysicalDifficulties !== undefined && (
                                <div className="p-3 rounded-lg border bg-gray-50 print:bg-white print:border-gray-300">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${!report.healthAndSafety.hasPhysicalDifficulties
                                            ? 'bg-green-100'
                                            : 'bg-orange-100'
                                            } flex items-center justify-center print:bg-gray-100`}>
                                            {!report.healthAndSafety.hasPhysicalDifficulties ? (
                                                <CheckCircle className="h-5 w-5 text-green-600 print:text-black" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-orange-600 print:text-black" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <span className="font-medium">Physical Fitness</span>
                                            <p className="text-sm text-gray-600 mt-0.5">
                                                {!report.healthAndSafety.hasPhysicalDifficulties
                                                    ? "Can climb stairs and has no physical difficulties"
                                                    : "Has physical difficulties"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Acknowledgements */}
            {report.acknowledgements && Object.keys(report.acknowledgements).length > 0 && (
                <Card className="print:shadow-none print:border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-lg">Acknowledgements & Agreements</CardTitle>
                        <CardDescription className="print:hidden">Policies and terms acknowledged during onboarding</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(() => {
                                const labels = {
                                    role: 'Driver Role',
                                    blockClassification: 'Block Densities',
                                    feeStructure: 'Fee Structure',
                                    paymentCycleSchedule: 'Payment Cycle & Schedule',
                                    routesPolicy: 'Routes & Task Addition',
                                    cancellationPolicy: 'Cancellation Policy',
                                    liabilities: 'Liabilities'
                                };
                                const dateFields = {
                                    role: 'roleDate',
                                    blockClassification: 'blockClassificationDate',
                                    feeStructure: 'feeStructureDate',
                                    paymentCycleSchedule: 'paymentCycleScheduleDate',
                                    routesPolicy: 'routesPolicyDate',
                                    cancellationPolicy: 'cancellationPolicyDate',
                                    liabilities: 'liabilitiesDate'
                                };

                                return Object.keys(labels).map((key) => {
                                    const value = report.acknowledgements?.[key];
                                    const dateField = dateFields[key];
                                    const timestamp = report.acknowledgements?.[dateField];

                                    return (
                                        <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 print:bg-white print:border-gray-300">
                                            <div className="flex items-center gap-3 flex-1">
                                                {value ? (
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center print:bg-gray-100">
                                                        <CheckCircle className="h-5 w-5 text-green-600 print:text-black" />
                                                    </div>
                                                ) : (
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center print:bg-gray-100">
                                                        <XCircle className="h-5 w-5 text-red-600 print:text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <span className="font-medium block">
                                                        {labels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                    <span className="text-xs text-gray-500 block">
                                                        {value ? 'Acknowledged and accepted' : 'Not yet acknowledged'}
                                                    </span>
                                                    {formatDate(timestamp) !== 'N/A' && (
                                                        <span className="text-xs text-gray-400 block">
                                                            {formatDate(timestamp)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={value ? "default" : "secondary"} className={value ? "bg-green-600 print:bg-white print:text-black print:border-black" : ""}>
                                                    {value ? 'Completed' : 'Pending'}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default DriverReport;
