import { useState, useEffect } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminServices } from "../../lib/admin-services";
import FeeStructureManager from "../../components/admin/FeeStructureManager";
import FacilityManager from "../../components/admin/FacilityManager";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";
import { 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Trash2,
  Edit,
  BarChart3,
  RefreshCw,
  Eye,
  Search,
  Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { getCurrentStage } from "../../lib/progress-tracking";

export default function AdminDashboard() {
  const { currentUser, isAuthorized, signOut } = useAdminAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onboardingFilter, setOnboardingFilter] = useState("all");

  useEffect(() => {
    // Only load data if user is authenticated and authorized
    if (currentUser && isAuthorized) {
      loadData();
    }
  }, [currentUser, isAuthorized]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Force token refresh to ensure Firestore rules can read the email
      const { auth } = await import('../../lib/firebase');
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.getIdToken(true); // Force refresh
      }
      
      const [applicationsData, statsData] = await Promise.all([
        adminServices.getAllApplications(),
        adminServices.getApplicationStats()
      ]);
      
      setApplications(applicationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading data",
        description: "Unable to load admin data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (email, status) => {
    try {
      const success = await adminServices.updateApplicationStatus(email, status, adminNotes);
      if (success) {
        toast({
          title: "Status updated",
          description: `Application status updated to ${status}.`,
        });
        setAdminNotes("");
        setSelectedApplication(null);
        await loadData(); // Reload data to reflect changes
      } else {
        toast({
          title: "Update failed",
          description: "Unable to update application status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Update failed",
        description: error.message || "Unable to update application status.",
        variant: "destructive",
      });
    }
  };

  const handleResetProgress = async (email) => {
    try {
      const result = await adminServices.resetDriverProgress(email);
      if (result.success) {
        toast({
          title: "Progress reset",
          description: "Driver can now restart the onboarding process.",
        });
        loadData();
      } else {
        toast({
          title: "Reset failed",
          description: result.message || "Unable to reset driver progress.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error resetting progress:', error);
      toast({
        title: "Reset failed",
        description: "Unable to reset driver progress.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApplication = async (email) => {
    try {
      const success = await adminServices.deleteApplication(email);
      if (success) {
        toast({
          title: "Application deleted",
          description: "Application has been permanently deleted.",
        });
        loadData();
      } else {
        toast({
          title: "Delete failed",
          description: "Unable to delete application.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      toast({
        title: "Delete failed",
        description: "Unable to delete application.",
        variant: "destructive",
      });
    }
  };

  // Filter applications based on search and filters
  const filteredApplications = applications.filter((app) => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      app.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.city?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "pending" && (!app.status || app.status === "pending")) ||
      app.status === statusFilter;

    // Onboarding filter
    const matchesOnboarding = onboardingFilter === "all" || 
      app.onboardingStatus === onboardingFilter;

    return matchesSearch && matchesStatus && matchesOnboarding;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status || 'pending'}
      </Badge>
    );
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Laundryheap Admin</h1>
                <p className="text-sm text-gray-500">Driver Onboarding Management</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[200px] sm:max-w-none">{currentUser?.email}</span>
              <Button variant="outline" size="sm" onClick={loadData} className="shrink-0">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={signOut} className="shrink-0">
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.pending || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.approved || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.completed || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{stats.rejected || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="fee-structures">Fee Structures</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6 mt-6">
            {/* Search and Filters */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-600" />
                  Search & Filter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                    <Input
                      placeholder="Search by email, name, or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                  <div className="relative z-40">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-white">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative z-40">
                    <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Onboarding" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-white">
                        <SelectItem value="all">All Onboarding</SelectItem>
                        <SelectItem value="started">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{filteredApplications.length}</span> of <span className="font-semibold text-gray-900">{applications.length}</span> applications
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card className="shadow-sm border border-gray-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Applications</CardTitle>
                <CardDescription>Manage and review driver applications</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 border-b border-gray-200">
                        <TableHead className="font-semibold text-gray-700">Email</TableHead>
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">City</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Current Stage</TableHead>
                        <TableHead className="font-semibold text-gray-700">Progress</TableHead>
                        <TableHead className="font-semibold text-gray-700">Created</TableHead>
                        <TableHead className="font-semibold text-right text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                            <div className="flex flex-col items-center gap-2">
                              <FileText className="h-8 w-8 text-gray-400" />
                              <p className="text-sm font-medium">No applications found</p>
                              <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredApplications.map((app) => (
                        <TableRow key={app.id} className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                          <TableCell className="font-medium text-sm py-4">{app.email}</TableCell>
                          <TableCell className="text-sm py-4">{app.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm py-4">{app.city || 'N/A'}</TableCell>
                          <TableCell className="py-4">{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="text-xs">
                              {getCurrentStage(app)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">{getOnboardingStatusBadge(app.onboardingStatus)}</TableCell>
                          <TableCell className="text-sm text-gray-600 py-4">
                            {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => {
                                  setSelectedApplication(null);
                                  // If report exists, show it; otherwise create a view from available data
                                  if (app.report) {
                                    setSelectedReport(app.report);
                                  } else {
                                    // Create a report-like object from available data
                                    setSelectedReport({
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
                                        vehicleType: app.vehicleType,
                                        country: app.country,
                                      },
                                      availability: app.availability?.availability || app.availability,
                                      verification: app.verification,
                                      acknowledgements: {
                                        role: app.roleUnderstood || false,
                                        blockClassification: app.blocksClassificationAcknowledged || false,
                                        feeStructure: app.acknowledgedFeeStructure || app.feeStructureAcknowledged || false,
                                        routesPolicy: app.routesPolicyAcknowledged || false,
                                        cancellationPolicy: app.acknowledgedCancellationPolicy || app.cancellationPolicyAcknowledged || false,
                                        liabilities: app.acknowledgedLiabilities || false,
                                      },
                                      healthAndSafety: {
                                        smokingStatus: app.smokingStatus || null,
                                        hasPhysicalDifficulties: app.hasPhysicalDifficulties || false,
                                      },
                                      onboardingStatus: app.onboardingStatus,
                                      createdAt: app.createdAt,
                                      progress: app.progress,
                                    });
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedReport(null);
                                  setSelectedApplication(app);
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              {app.onboardingStatus === 'completed' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                    >
                                      Reset
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="z-[200]">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reset Onboarding Progress</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to reset this driver's onboarding progress? 
                                        This will allow them to restart the onboarding process from the beginning.
                                        Their personal information and Fountain data will be preserved.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleResetProgress(app.email)}
                                        className="bg-orange-600 hover:bg-orange-700"
                                      >
                                        Reset Progress
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="z-[200]">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Application</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this application? This action cannot be undone.
                                      All related data including availability, verification details, and reports will be permanently removed.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteApplication(app.email)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fee Structures Tab */}
          <TabsContent value="fee-structures">
            <FeeStructureManager />
          </TabsContent>

          {/* Facilities Tab */}
          <TabsContent value="facilities">
            <FacilityManager />
          </TabsContent>

          
        </Tabs>
      </div>

      {/* Status Update Dialog */}
      {selectedApplication && (
        <Dialog open={!!selectedApplication} onOpenChange={(open) => {
          if (!open) {
            setSelectedApplication(null);
            setAdminNotes("");
          }
        }}>
          <DialogContent className="max-w-2xl z-[200]">
            <DialogHeader>
              <DialogTitle>Update Application Status</DialogTitle>
              <DialogDescription>
                Managing application for {selectedApplication.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              {/* Application Summary */}
              <Card className="bg-gray-50 border border-gray-200">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedApplication.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">City:</span>
                      <span className="ml-2 font-medium">{selectedApplication.city || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Stage:</span>
                      <span className="ml-2 font-medium">{getCurrentStage(selectedApplication)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Progress:</span>
                      <span className="ml-2">{getOnboardingStatusBadge(selectedApplication.onboardingStatus)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Update */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Application Status</label>
                  <div className="relative z-[150]">
                    <Select 
                      value={selectedApplication.status || 'pending'} 
                      onValueChange={(value) => {
                        setSelectedApplication({...selectedApplication, status: value});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="z-[250] bg-white">
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Admin Notes (Optional)</label>
                  <Textarea
                    placeholder="Add internal notes about this application..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedApplication(null);
                  setAdminNotes("");
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                onClick={() => handleStatusUpdate(selectedApplication.email, selectedApplication.status || 'pending')}
              >
                Update Status
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Report View Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto z-[200]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">Driver Application Details</DialogTitle>
                <DialogDescription className="text-base mt-1">
                  {selectedReport?.driverEmail || selectedReport?.email || 'N/A'}
                </DialogDescription>
              </div>
              {selectedReport?.reportId ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete Report
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                  <Eye className="h-3 w-3 mr-1" />
                  Data Snapshot
                </Badge>
              )}
            </div>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-6 mt-4">
              {/* Application Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Application Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedReport.reportId && (
                        <div>
                          <span className="text-gray-600">Report ID:</span>
                          <span className="ml-2 font-mono text-xs">{selectedReport.reportId}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600">Email:</span>
                        <span className="ml-2 font-medium">{selectedReport.driverEmail || selectedReport.email || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Onboarding Status:</span>
                        <span className="ml-2">{getOnboardingStatusBadge(selectedReport.onboardingStatus || 'started')}</span>
                      </div>
                      {selectedReport.createdAt && (
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <span className="ml-2 font-medium">
                            {selectedReport.createdAt?.toDate?.()?.toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            }) || new Date(selectedReport.createdAt).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                </CardContent>
              </Card>

              {/* Driver Information */}
              {(selectedReport.driverInfo || selectedReport.personalInfo) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Driver Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedReport.driverInfo || selectedReport.personalInfo || {}).map(([key, value]) => (
                        <div key={key}>
                          <strong className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong>{' '}
                          {value ? String(value) : 'N/A'}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Availability */}
              {selectedReport.availability && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Availability Schedule</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Day</TableHead>
                            <TableHead className="font-semibold text-center">PM</TableHead>
                            <TableHead className="font-semibold text-center">NGT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(selectedReport.availability).map(([day, slots]) => (
                            <TableRow key={day} className="hover:bg-gray-50">
                              <TableCell className="font-medium capitalize">{day}</TableCell>
                              <TableCell className="text-center">
                                {slots.noon ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                    <CheckCircle className="h-4 w-4" />
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-600">
                                    <XCircle className="h-4 w-4" />
                                    No
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {slots.evening ? (
                                  <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                                    <CheckCircle className="h-4 w-4" />
                                    Yes
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-600">
                                    <XCircle className="h-4 w-4" />
                                    No
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Verification */}
              {(selectedReport.verification || selectedReport.verificationDetails) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Verification Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(selectedReport.verification || selectedReport.verificationDetails || {}).map(([key, value]) => {
                        // Skip timestamp fields
                        if (key.includes('At') || key === 'email' || key === 'createdAt' || key === 'updatedAt') {
                          return null;
                        }
                        return (
                          <div key={key}>
                            <strong className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong>{' '}
                            {value ? String(value) : 'N/A'}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Health & Safety Information */}
              {selectedReport.healthAndSafety && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Health & Safety</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedReport.healthAndSafety.smokingStatus && (
                        <div className="p-3 rounded-lg border bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">Smoking Status</span>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {selectedReport.healthAndSafety.smokingStatus === 'non-smoker' 
                                  ? "Non-smoker" 
                                  : "Smoker - Understands policy"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="p-3 rounded-lg border bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full ${
                            !selectedReport.healthAndSafety.hasPhysicalDifficulties 
                              ? 'bg-green-100' 
                              : 'bg-orange-100'
                          } flex items-center justify-center`}>
                            {!selectedReport.healthAndSafety.hasPhysicalDifficulties ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium">Physical Fitness</span>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {!selectedReport.healthAndSafety.hasPhysicalDifficulties 
                                ? "Can climb stairs and has no physical difficulties" 
                                : "Has physical difficulties"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Acknowledgements */}
              {selectedReport.acknowledgements && Object.keys(selectedReport.acknowledgements).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acknowledgements & Agreements</CardTitle>
                    <CardDescription>Policies and terms acknowledged during onboarding</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(selectedReport.acknowledgements).map(([key, value]) => {
                        // Skip date fields
                        if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
                          return null;
                        }
                        
                        // Friendly labels for each acknowledgement
                        const labels = {
                          role: 'Driver Role',
                          blockClassification: 'Block Densities',
                          feeStructure: 'Fee Structure',
                          routesPolicy: 'Routes & Task Addition',
                          cancellationPolicy: 'Cancellation Policy',
                          liabilities: 'Liabilities'
                        };
                        
                        return (
                          <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                            <div className="flex items-center gap-3">
                              {value ? (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                              ) : (
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                  <XCircle className="h-5 w-5 text-red-600" />
                                </div>
                              )}
                              <div>
                                <span className="font-medium">
                                  {labels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {value ? 'Acknowledged and accepted' : 'Not yet acknowledged'}
                                </p>
                              </div>
                            </div>
                            <Badge variant={value ? "default" : "secondary"} className={value ? "bg-green-600" : ""}>
                              {value ? 'Completed' : 'Pending'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Progress Tracking */}
              {selectedReport.progress && Object.keys(selectedReport.progress).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Progress Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(selectedReport.progress).map(([key, value]) => (
                        <div key={key}>
                          <strong className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</strong>{' '}
                          <span className="text-sm text-gray-600">
                            {value ? 'Completed' : 'Not completed'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Raw JSON View */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Raw Report Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(selectedReport, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
