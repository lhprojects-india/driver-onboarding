import { useState, useEffect } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminServices } from "../../lib/admin-services";
import FeeStructureManager from "../../components/admin/FeeStructureManager";
import FacilityManager from "../../components/admin/FacilityManager";
import AdminManager from "../../components/admin/AdminManager";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Calendar,
  MapPin,
  FileText,
  User,
  Phone,
  Mail,
  Briefcase,
  Trash2,
  Users,
  ChevronRight,
  Printer,
  Settings,
  LogOut,
  Edit,
  BarChart3,
  RefreshCw,
  UserCheck,
  PauseCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { getCurrentStage } from "../../lib/progress-tracking";
import LaundryheapLogo from "../../assets/logo";
import { auth } from "../../lib/firebase";
import { getVehicleTypeFromMOT } from "../../lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Skeleton } from "../../components/ui/skeleton";

const DAYS_ORDER = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

export default function AdminDashboard() {
  const { currentUser, isAuthorized, signOut, adminRole } = useAdminAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [applicationToDelete, setApplicationToDelete] = useState(null);
  const [applicationToReset, setApplicationToReset] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onboardingFilter, setOnboardingFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("Completed");
  const [cityFilter, setCityFilter] = useState("all");

  useEffect(() => {
    // Add admin-page class to body to enable text selection
    document.body.classList.add('admin-page');

    // Only load data if user is authenticated and authorized
    if (currentUser && isAuthorized) {
      loadData();
    }

    // Cleanup: remove class when component unmounts
    return () => {
      document.body.classList.remove('admin-page');
    };
  }, [currentUser, isAuthorized]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Force token refresh to ensure Firestore rules can read the email
      const user = auth.currentUser;
      if (user) {
        await user.getIdToken(true); // Force refresh
      }

      let [applicationsData, statsData] = await Promise.all([
        adminServices.getAllApplications(),
        adminServices.getApplicationStats()
      ]);

      // Filter by accessible cities if restricted
      if (currentUser?.accessibleCities?.length > 0 && adminRole !== 'super_admin') {
        const accessibleCitiesLower = currentUser.accessibleCities.map(c => c.toLowerCase());
        applicationsData = applicationsData.filter(app => app.city && accessibleCitiesLower.includes(app.city.toLowerCase()));

        // Recalculate stats from filtered applications
        statsData = {
          total: applicationsData.length,
          pending: applicationsData.filter(app => !app.status || app.status === 'pending').length,
          onHold: applicationsData.filter(app => app.status === 'on_hold').length,
          approved: applicationsData.filter(app => app.status === 'approved').length,
          hired: applicationsData.filter(app => app.status === 'hired').length,
          rejected: applicationsData.filter(app => app.status === 'rejected').length,
          completed: applicationsData.filter(app => app.onboardingStatus === 'completed').length,
          inProgress: applicationsData.filter(app => app.onboardingStatus === 'started').length,
        };
      }

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

  // Extract unique cities and stages from applications
  const uniqueCities = [...new Set(applications.map(app => app.city).filter(Boolean))].sort();
  const uniqueStages = [...new Set(applications.map(app => getCurrentStage(app)))].sort();

  // Derived analytics data
  const withdrawnCount = applications.filter(app => app.status === "withdrawn").length;
  const onHoldCount = applications.filter(app => app.status === "on_hold").length;

  const statusChartData = [
    { status: "Pending", key: "pending", count: stats.pending || 0 },
    { status: "On Hold", key: "on_hold", count: onHoldCount },
    { status: "Approved", key: "approved", count: stats.approved || 0 },
    { status: "Hired", key: "hired", count: stats.hired || 0 },
    { status: "Rejected", key: "rejected", count: stats.rejected || 0 },
    { status: "Withdrawn", key: "withdrawn", count: withdrawnCount },
  ].filter(item => item.count > 0);

  const onboardingChartData = [
    { name: "Completed", value: stats.completed || 0 },
    { name: "In Progress", value: stats.inProgress || 0 },
  ].filter(item => item.value > 0);

  const applicationsByDate = (() => {
    const dateMap = {};

    applications.forEach((app) => {
      if (!app.createdAt) return;
      const dateObj = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
      if (Number.isNaN(dateObj.getTime())) return;

      const key = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!dateMap[key]) {
        dateMap[key] = { date: key, total: 0, hired: 0, rejected: 0 };
      }
      dateMap[key].total += 1;
      if (app.status === "hired") dateMap[key].hired += 1;
      if (app.status === "rejected") dateMap[key].rejected += 1;
    });

    return Object.values(dateMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((item) => ({
        ...item,
        label: new Date(item.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      }));
  })();

  const cityInsights = (() => {
    const cityMap = {};

    applications.forEach((app) => {
      const city = app.city || "Unknown";
      if (!cityMap[city]) {
        cityMap[city] = {
          city,
          total: 0,
          hired: 0,
          completed: 0,
          rejected: 0,
        };
      }

      cityMap[city].total += 1;
      if (app.status === "hired") cityMap[city].hired += 1;
      if (app.onboardingStatus === "completed") cityMap[city].completed += 1;
      if (app.status === "rejected") cityMap[city].rejected += 1;
    });

    return Object.values(cityMap)
      .map((item) => ({
        ...item,
        // Conversion vs total applications
        conversionRate: item.total > 0 ? Math.round((item.hired / item.total) * 100) : 0,
        // Conversion vs completed applications
        completedConversionRate:
          item.completed > 0 ? Math.round((item.hired / item.completed) * 100) : 0,
      }))
      .sort((a, b) => b.hired - a.hired);
  })();

  const STATUS_COLORS = {
    Pending: "#FFD06D", // Brand-yellow
    "On Hold": "#FFB55D", // Brand-shadeYellow (replacing orange)
    Approved: "#04B4A8", // Brand-shadeTeal
    Hired: "#202B93", // Brand-shadeBlue
    Rejected: "#EF8EA2", // Brand-pink (using pink for rejected/destructive)
    Withdrawn: "#6b7280",
  };

  const PIE_COLORS = ["#0890F1", "#2FCCC0", "#FFD06D", "#EF8EA2", "#202B93"];

  // Count active filters
  const activeFiltersCount = [
    searchQuery && 1,
    statusFilter !== "all" && 1,
    stageFilter !== "all" && 1,
    cityFilter !== "all" && 1,
    onboardingFilter !== "all" && 1,
  ].filter(Boolean).length;

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

    // Stage filter
    const matchesStage = stageFilter === "all" ||
      getCurrentStage(app) === stageFilter;

    // City filter
    const matchesCity = cityFilter === "all" ||
      app.city === cityFilter;

    return matchesSearch && matchesStatus && matchesOnboarding && matchesStage && matchesCity;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "outline", icon: Clock, className: "bg-brand-lightYellow text-gray-800 border-brand-yellow", label: "Pending" },
      approved: { variant: "default", icon: CheckCircle, className: "bg-brand-teal hover:bg-brand-shadeTeal text-white", label: "Approved" },
      rejected: { variant: "destructive", icon: XCircle, className: "bg-brand-pink hover:bg-brand-shadePink text-white", label: "Rejected" },
      hired: {
        variant: "default",
        icon: UserCheck,
        className: "bg-brand-blue hover:bg-brand-shadeBlue text-white",
        label: "Hired",
      },
      on_hold: {
        variant: "outline",
        icon: PauseCircle,
        className: "border-brand-yellow text-brand-shadeYellow bg-brand-lightYellow",
        label: "On Hold",
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge
        variant={config.variant}
        className={`flex items-center gap-1 rounded-md px-2.5 py-0.5 ${config.className || ""}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label || status || "pending"}
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
      <div className="min-h-screen bg-gray-50/50">
        {/* Header Skeleton */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-30 transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div>
                  <Skeleton className="h-7 w-64 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto bg-gray-50 p-1.5 rounded-full border border-gray-100">
                <div className="hidden sm:flex items-center gap-2 px-3">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          </div>
        </header>

        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="relative overflow-hidden border-0 shadow-sm transition-all duration-300 h-32">
                <div className="absolute top-0 left-0 w-1 h-full bg-gray-200"></div>
                <CardHeader className="pb-2 relative z-10">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="relative z-10 mt-2">
                  <Skeleton className="h-9 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content Skeleton */}
          <div className="space-y-6">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex gap-1">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-32 rounded-lg" />
              ))}
            </div>

            <Card className="bg-white border-0 shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-white px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div>
                      <Skeleton className="h-6 w-48 mb-1" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                </div>
              </div>
              <CardContent className="p-6 space-y-6 bg-white">
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm border border-gray-100">
              <CardHeader className="bg-white border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-9 w-32 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-12 h-12 flex items-center justify-center relative bg-white rounded-full p-1 shadow-sm">
                  <svg
                    width="40"
                    height="40"
                    viewBox="270 0 170 160"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                  >
                    <path
                      d="M280.839 14.6317C274.557 19.0512 270.817 26.2593 270.817 33.9496V83.0697C270.817 93.8463 276.229 103.9 285.217 109.821L342.641 147.655C350.499 152.832 360.678 152.832 368.536 147.655L425.96 109.821C434.948 103.9 440.36 93.8463 440.36 83.0698V33.9496C440.36 26.2594 436.62 19.0512 430.338 14.6317L415.635 4.28764C406.826 -1.90906 394.946 -1.33884 386.769 5.67309L370.912 19.272C362.091 26.836 349.086 26.836 340.265 19.272L324.408 5.67308C316.231 -1.33884 304.351 -1.90906 295.542 4.28764L280.839 14.6317Z"
                      fill="#FFD06D"
                    />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                  Driver Onboarding
                </h1>
                <p className="text-sm text-gray-500 font-medium tracking-wide">Admin Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto bg-gray-50 p-1.5 rounded-full border border-gray-100">
              <div className="hidden sm:flex items-center gap-2 px-3">
                <div className="h-2 w-2 rounded-full bg-brand-teal animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600 truncate max-w-[150px]">{currentUser?.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={loadData} className="shrink-0 rounded-full h-8 w-8 p-0 hover:bg-white hover:shadow-sm">
                <RefreshCw className="h-4 w-4 text-gray-600" />
                <span className="sr-only">Refresh</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} className="shrink-0 rounded-full h-8 w-8 p-0 hover:bg-brand-lightPink text-gray-500 hover:text-brand-pink hover:shadow-sm">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue"></div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-lightBlue/30 group-hover:bg-brand-lightBlue/50 transition-colors"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Total Applications</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-gray-900 group-hover:scale-105 transition-transform origin-left">{stats.total || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-yellow"></div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-lightYellow/30 group-hover:bg-brand-lightYellow/50 transition-colors"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-brand-shadeYellow group-hover:scale-105 transition-transform origin-left">{stats.pending || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-teal"></div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-lightTeal/30 group-hover:bg-brand-lightTeal/50 transition-colors"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-brand-shadeTeal group-hover:scale-105 transition-transform origin-left">{stats.approved || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-blue"></div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-lightBlue/30 group-hover:bg-brand-lightBlue/50 transition-colors"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Hired</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-brand-shadeBlue group-hover:scale-105 transition-transform origin-left">{stats.hired || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-teal"></div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-lightTeal/30 group-hover:bg-brand-lightTeal/50 transition-colors"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-brand-shadeTeal group-hover:scale-105 transition-transform origin-left">{stats.completed || 0}</div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-pink"></div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-lightPink/30 group-hover:bg-brand-lightPink/50 transition-colors"></div>
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-brand-shadePink group-hover:scale-105 transition-transform origin-left">{stats.rejected || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="applications" className="space-y-6">
          <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 inline-flex">
            <TabsList className="bg-transparent h-auto p-0 gap-1">
              <TabsTrigger
                value="applications"
                className="data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                Applications
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger
                value="fee-structures"
                className="data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                Fee Structures
              </TabsTrigger>
              <TabsTrigger
                value="facilities"
                className="data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2 text-sm font-medium transition-all"
              >
                Facilities
              </TabsTrigger>
              {(adminRole === 'super_admin' || adminRole === 'app_admin') && (
                <TabsTrigger
                  value="admins"
                  className="data-[state=active]:bg-brand-blue data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2 text-sm font-medium transition-all"
                >
                  Admins
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <Card className="border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-blue" />
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Driver Funnel & Insights
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600">
                      Overview of applications moving from applied to hired across cities.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {applications.length} applications analysed
                </Badge>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status distribution */}
                  <div className="col-span-1 lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-800">Application Outcomes</p>
                      <p className="text-xs text-gray-500">
                        Pending, approved, hired, rejected, withdrawn
                      </p>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" name="Applications">
                            {statusChartData.map((entry) => (
                              <Cell
                                key={entry.status}
                                fill={STATUS_COLORS[entry.status] || "#0f172a"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Onboarding funnel */}
                  <div className="col-span-1">
                    <p className="text-sm font-semibold text-gray-800 mb-3">Onboarding Progress</p>
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={onboardingChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {onboardingChartData.map((entry, index) => (
                              <Cell
                                key={entry.name}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      <p>
                        <span className="font-semibold">Completed:</span>{" "}
                        {stats.completed || 0}
                      </p>
                      <p>
                        <span className="font-semibold">In Progress:</span>{" "}
                        {stats.inProgress || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* City insights table */}
                {cityInsights.length > 0 && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-800">
                        City Performance (Top 10 by hired drivers)
                      </p>
                      <p className="text-xs text-gray-500">
                        Conversion = hired ÷ total applications, and hired ÷ completed
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="text-xs font-semibold text-gray-700">
                              City
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-700 text-right">
                              Total
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-700 text-right">
                              Completed
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-700 text-right">
                              Hired
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-700 text-right">
                              Rejected
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-700 text-right">
                              Conversion
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-gray-700 text-right">
                              Conv. vs Completed
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cityInsights.slice(0, 10).map((city) => (
                            <TableRow key={city.city}>
                              <TableCell className="text-sm font-medium">
                                {city.city}
                              </TableCell>
                              <TableCell className="text-sm text-right">
                                {city.total}
                              </TableCell>
                              <TableCell className="text-sm text-right">
                                {city.completed}
                              </TableCell>
                              <TableCell className="text-sm text-right text-brand-shadeTeal">
                                {city.hired}
                              </TableCell>
                              <TableCell className="text-sm text-right text-brand-pink">
                                {city.rejected}
                              </TableCell>
                              <TableCell className="text-sm text-right">
                                {city.conversionRate}%
                              </TableCell>
                              <TableCell className="text-sm text-right">
                                {city.completedConversionRate}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6 mt-6">
            {/* Search and Filters */}
            <Card className="bg-white border-0 shadow-sm border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-white/50 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-brand-lightBlue flex items-center justify-center">
                      <Filter className="h-5 w-5 text-brand-blue" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Filters & Search</h3>
                      <p className="text-sm text-gray-500 font-medium">Refine your application search</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-brand-blue hover:bg-brand-lightBlue/30 transition-colors"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setOnboardingFilter("all");
                      setStageFilter("all");
                      setCityFilter("all");
                    }}
                  >
                    Reset All
                  </Button>
                </div>
              </div>

              <CardContent className="p-6 space-y-6 bg-white">
                {/* Search Row */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-blue to-brand-teal rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-200"></div>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search by email, name, or city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-10 h-12 rounded-xl border-gray-200 bg-white focus:border-brand-blue focus:ring-4 focus:ring-brand-lightBlue/20 transition-all text-base"
                    />
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-hover:text-brand-blue transition-colors" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                      APPLICATION STATUS
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full h-11 rounded-lg border-gray-200 bg-gray-50/50 hover:bg-white focus:ring-2 focus:ring-brand-blue/20 transition-all flex flex-row items-center justify-between [&>span]:order-1 [&>svg]:order-2">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="hired">Hired</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                      CURRENT STAGE
                    </label>
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger className="w-full h-11 rounded-lg border-gray-200 bg-gray-50/50 hover:bg-white focus:ring-2 focus:ring-brand-blue/20 transition-all flex flex-row items-center justify-between [&>span]:order-1 [&>svg]:order-2">
                        <SelectValue placeholder="All stages" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        {uniqueStages.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                      CITY
                    </label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-full h-11 rounded-lg border-gray-200 bg-gray-50/50 hover:bg-white focus:ring-2 focus:ring-brand-blue/20 transition-all flex flex-row items-center justify-between [&>span]:order-1 [&>svg]:order-2">
                        <SelectValue placeholder="All cities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        {uniqueCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                      ONBOARDING PROGRESS
                    </label>
                    <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
                      <SelectTrigger className="w-full h-11 rounded-lg border-gray-200 bg-gray-50/50 hover:bg-white focus:ring-2 focus:ring-brand-blue/20 transition-all flex flex-row items-center justify-between [&>span]:order-1 [&>svg]:order-2">
                        <SelectValue placeholder="All progress" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Progress</SelectItem>
                        <SelectItem value="started">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Active Filters */}
                {activeFiltersCount > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wide mr-2">Active Filters:</span>
                      {searchQuery && (
                        <Badge variant="secondary" className="bg-brand-lightBlue text-brand-shadeBlue border border-brand-blue/20 px-3 py-1 rounded-full font-medium">
                          Search: "{searchQuery}"
                          <button
                            onClick={() => setSearchQuery("")}
                            className="ml-2 hover:text-brand-blue transition-colors inline-flex items-center"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      )}
                      {statusFilter !== "all" && (
                        <Badge variant="secondary" className="bg-brand-lightBlue text-brand-shadeBlue border border-brand-blue/20 px-3 py-1 rounded-full font-medium">
                          Status: {statusFilter === "pending"
                            ? "Pending Review"
                            : statusFilter === "on_hold"
                              ? "On Hold"
                              : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                          <button
                            onClick={() => setStatusFilter("all")}
                            className="ml-2 hover:text-brand-blue transition-colors inline-flex items-center"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      )}
                      {stageFilter !== "all" && (
                        <Badge variant="secondary" className="bg-brand-lightBlue text-brand-shadeBlue border border-brand-blue/20 px-3 py-1 rounded-full font-medium">
                          Stage: {stageFilter}
                          <button
                            onClick={() => setStageFilter("all")}
                            className="ml-2 hover:text-brand-blue transition-colors inline-flex items-center"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      )}
                      {cityFilter !== "all" && (
                        <Badge variant="secondary" className="bg-brand-lightBlue text-brand-shadeBlue border border-brand-blue/20 px-3 py-1 rounded-full font-medium">
                          City: {cityFilter}
                          <button
                            onClick={() => setCityFilter("all")}
                            className="ml-2 hover:text-brand-blue transition-colors inline-flex items-center"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      )}
                      {onboardingFilter !== "all" && (
                        <Badge variant="secondary" className="bg-brand-lightBlue text-brand-shadeBlue border border-brand-blue/20 px-3 py-1 rounded-full font-medium">
                          Progress: {onboardingFilter === "started" ? "In Progress" : "Completed"}
                          <button
                            onClick={() => setOnboardingFilter("all")}
                            className="ml-2 hover:text-brand-blue transition-colors inline-flex items-center"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Applications Table */}
            <div className="bg-white border border-gray-200 rounded-md shadow-sm">
              {/* Summary Bar */}
              <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm text-gray-700">
                    Filtered applications: <span className="font-semibold">{filteredApplications.length}</span> | Total applications: <span className="font-semibold">{applications.length}</span>
                  </p>
                  {filteredApplications.filter(app => app.onboardingStatus === 'completed' && (!app.status || app.status === 'pending')).length > 0 && (
                    <Badge className="bg-brand-lightYellow text-brand-shadeYellow border-brand-yellow hover:bg-brand-lightYellow">
                      <Clock className="h-3 w-3 mr-1" />
                      {filteredApplications.filter(app => app.onboardingStatus === 'completed' && (!app.status || app.status === 'pending')).length} completed application{filteredApplications.filter(app => app.onboardingStatus === 'completed' && (!app.status || app.status === 'pending')).length !== 1 ? 's' : ''} awaiting review
                    </Badge>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white border-b border-gray-200">
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">Name</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">Email</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">Phone</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">City</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">Current Stage</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">Progress</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-left">Created</TableHead>
                      <TableHead className="font-semibold text-gray-700 py-3 px-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-gray-500 px-4">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-gray-400" />
                            <p className="text-sm font-medium">No applications found</p>
                            <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApplications.map((app) => (
                        <TableRow key={app.id} className="hover:bg-gray-50 border-b border-gray-200 transition-colors">
                          <TableCell className="text-sm py-3 px-4 text-left font-medium">{app.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm py-3 px-4 text-left">{app.email}</TableCell>
                          <TableCell className="text-sm py-3 px-4 text-left">{app.phone || 'N/A'}</TableCell>
                          <TableCell className="text-sm py-3 px-4 text-left">{app.city || 'N/A'}</TableCell>
                          <TableCell className="py-3 px-4 text-left">{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="py-3 px-4 text-left">
                            <Badge variant="outline" className="text-xs">
                              {getCurrentStage(app)}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-left">{getOnboardingStatusBadge(app.onboardingStatus)}</TableCell>
                          <TableCell className="text-sm text-gray-600 py-3 px-4 text-left">
                            {app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'N/A'}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-brand-blue text-brand-blue hover:bg-brand-lightBlue"
                                onClick={() => {
                                  setSelectedApplication(null);
                                  // If report exists, show it; otherwise create a view from available data
                                  if (app.report) {
                                    // Helper to extract timestamp value (handles Firestore Timestamps)
                                    const getTimestamp = (...fields) => {
                                      for (const field of fields) {
                                        if (field) {
                                          // If it has toDate method (Firestore Timestamp), convert it
                                          if (field.toDate && typeof field.toDate === 'function') {
                                            return field.toDate();
                                          }
                                          // If it has seconds (serialized Firestore Timestamp)
                                          if (field.seconds) {
                                            return new Date(field.seconds * 1000);
                                          }
                                          // Otherwise return as is
                                          return field;
                                        }
                                      }
                                      return null;
                                    };

                                    // Use existing report but enhance acknowledgements with timestamps if missing
                                    const enhancedAcknowledgements = {
                                      ...app.report.acknowledgements,
                                      // Add boolean flags from live data (prioritize live over stale report)
                                      role: app.roleUnderstood || app.roleAcknowledged || app?.progress_role?.confirmed || app.report.acknowledgements?.role || false,
                                      blockClassification: app.blocksClassificationAcknowledged || app.report.acknowledgements?.blockClassification || false,
                                      feeStructure: app.acknowledgedFeeStructure || app.feeStructureAcknowledged || app.report.acknowledgements?.feeStructure || false,
                                      routesPolicy: app.routesPolicyAcknowledged || app.report.acknowledgements?.routesPolicy || false,
                                      cancellationPolicy: app.acknowledgedCancellationPolicy || app.cancellationPolicyAcknowledged || app.report.acknowledgements?.cancellationPolicy || false,
                                      liabilities: app.acknowledgedLiabilities || app?.progress_liabilities?.confirmed || app.report.acknowledgements?.liabilities || false,
                                      paymentCycleSchedule: app.acknowledgedPaymentCycleSchedule || app.paymentCycleScheduleAcknowledged || app.report.acknowledgements?.paymentCycleSchedule || false,

                                      // Add timestamp fields if they don't exist in the report
                                      roleDate: getTimestamp(
                                        app.report.acknowledgements?.roleDate,
                                        app.roleUnderstoodAt,
                                        app.roleAcknowledgedAt,
                                        app?.progress_role?.confirmedAt
                                      ),
                                      blockClassificationDate: getTimestamp(
                                        app.report.acknowledgements?.blockClassificationDate,
                                        app.blocksClassificationAcknowledgedAt
                                      ),
                                      feeStructureDate: getTimestamp(
                                        app.report.acknowledgements?.feeStructureDate,
                                        app.feeStructureAcknowledgedAt
                                      ),
                                      routesPolicyDate: getTimestamp(
                                        app.report.acknowledgements?.routesPolicyDate,
                                        app.routesPolicyAcknowledgedAt
                                      ),
                                      cancellationPolicyDate: getTimestamp(
                                        app.report.acknowledgements?.cancellationPolicyDate,
                                        app.cancellationPolicyAcknowledgedAt
                                      ),
                                      liabilitiesDate: getTimestamp(
                                        app.report.acknowledgements?.liabilitiesDate,
                                        app.liabilitiesAcknowledgedAt,
                                        app?.progress_liabilities?.confirmedAt
                                      ),
                                      paymentCycleScheduleDate: getTimestamp(
                                        app.report.acknowledgements?.paymentCycleScheduleDate,
                                        app.paymentCycleScheduleAcknowledgedAt
                                      ),
                                    };

                                    const enhancedReport = {
                                      ...app.report,
                                      acknowledgements: enhancedAcknowledgements
                                    };

                                    setSelectedReport(enhancedReport);
                                  } else {
                                    // Extract vehicle type from fountain data if available
                                    const vehicleTypeFromFountain = app.fountainData
                                      ? getVehicleTypeFromMOT(app.fountainData)
                                      : null;

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
                                        vehicleType: vehicleTypeFromFountain || app.vehicleType || null,
                                        country: app.country,
                                      },
                                      availability: app.availability?.availability || app.availability,
                                      verification: app.verification,
                                      acknowledgements: {
                                        role: app.roleUnderstood || app.roleAcknowledged || app?.progress_role?.confirmed || false,
                                        roleDate: app.roleUnderstoodAt || app.roleAcknowledgedAt || app?.progress_role?.confirmedAt || app?.progress_role?.confirmedAt?.toDate?.() || null,
                                        blockClassification: app.blocksClassificationAcknowledged || false,
                                        blockClassificationDate: app.blocksClassificationAcknowledgedAt || app.blocksClassificationAcknowledgedAt?.toDate?.() || null,
                                        feeStructure: app.acknowledgedFeeStructure || app.feeStructureAcknowledged || false,
                                        feeStructureDate: app.feeStructureAcknowledgedAt || app.feeStructureAcknowledgedAt?.toDate?.() || null,
                                        routesPolicy: app.routesPolicyAcknowledged || false,
                                        routesPolicyDate: app.routesPolicyAcknowledgedAt || app.routesPolicyAcknowledgedAt?.toDate?.() || null,
                                        cancellationPolicy: app.acknowledgedCancellationPolicy || app.cancellationPolicyAcknowledged || false,
                                        cancellationPolicyDate: app.cancellationPolicyAcknowledgedAt || app.cancellationPolicyAcknowledgedAt?.toDate?.() || null,
                                        liabilities: app.acknowledgedLiabilities || app?.progress_liabilities?.confirmed || false,
                                        liabilitiesDate: app.liabilitiesAcknowledgedAt || app?.progress_liabilities?.confirmedAt || app?.progress_liabilities?.confirmedAt?.toDate?.() || null,
                                        paymentCycleSchedule: app.acknowledgedPaymentCycleSchedule || app.paymentCycleScheduleAcknowledged || false,
                                        paymentCycleScheduleDate: app.paymentCycleScheduleAcknowledgedAt || null,
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
                                    });
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>

                              {/* Quick Approve/Reject for completed applications */}
                              {app.onboardingStatus === 'completed' && (adminRole === 'super_admin' || adminRole === 'app_admin' || adminRole === 'admin_fleet') && app.status !== 'approved' && app.status !== 'rejected' && app.status !== 'hired' && (
                                <>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="bg-brand-shadeTeal hover:bg-brand-teal text-white shadow-md hover:shadow-lg"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Approve
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="z-[200]">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Approve Application</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to approve this application for {app.email}?
                                          The driver will be notified of the approval.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleStatusUpdate(app.email, 'approved')}
                                          className="bg-brand-shadeTeal hover:bg-brand-teal"
                                        >
                                          Approve Application
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>

                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-brand-shadePink hover:text-brand-pink hover:bg-brand-lightPink border-brand-pink"
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Reject
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="z-[200]">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Application</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to reject this application for {app.email}?
                                          The driver will be notified of the rejection.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleStatusUpdate(app.email, 'rejected')}
                                          className="bg-brand-shadePink hover:bg-brand-pink"
                                        >
                                          Reject Application
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}

                              {/* Mark Hired button - only for approved applicants */}
                              {app.status === 'approved' && (adminRole === 'super_admin' || adminRole === 'app_admin' || adminRole === 'admin_fleet') && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="bg-brand-blue hover:bg-brand-shadeBlue text-white shadow-md hover:shadow-lg"
                                    >
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Mark Hired
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="z-[200]">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Mark Driver as Hired</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to mark this driver as hired for {app.email}?
                                        This will update the application status to "Hired".
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleStatusUpdate(app.email, 'hired')}
                                        className="bg-brand-blue hover:bg-brand-shadeBlue"
                                      >
                                        Mark Hired
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}

                              {/* Secondary Actions Dropdown */}
                              {(adminRole === 'super_admin' || adminRole === 'app_admin' || adminRole === 'admin_fleet') && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <span className="sr-only">Open menu</span>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-[160px] z-50 bg-white">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedReport(null);
                                        setSelectedApplication(app);
                                      }}
                                    >
                                      <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
                                      Edit
                                    </DropdownMenuItem>

                                    {app.onboardingStatus === 'completed' && (adminRole === 'super_admin' || adminRole === 'app_admin') && (
                                      <DropdownMenuItem
                                        onClick={() => setApplicationToReset(app)}
                                        className="text-brand-shadeYellow focus:text-brand-shadeYellow focus:bg-brand-lightYellow"
                                      >
                                        <RefreshCw className="mr-2 h-3.5 w-3.5" />
                                        Reset Progress
                                      </DropdownMenuItem>
                                    )}

                                    {(adminRole === 'super_admin' || adminRole === 'app_admin') && (
                                      <DropdownMenuItem
                                        onClick={() => setApplicationToDelete(app)}
                                        className="text-brand-pink focus:text-brand-pink focus:bg-brand-lightPink"
                                      >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                        Delete
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Fee Structures Tab */}
          <TabsContent value="fee-structures">
            <FeeStructureManager />
          </TabsContent>

          {/* Facilities Tab */}
          <TabsContent value="facilities">
            <FacilityManager />
          </TabsContent>

          {/* Admins Tab - Only visible to super_admin and app_admin */}
          {(adminRole === 'super_admin' || adminRole === 'app_admin') && (
            <TabsContent value="admins">
              <AdminManager />
            </TabsContent>
          )}

        </Tabs>
      </div>

      {/* Status Update Dialog */}
      {
        selectedApplication && (
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
                          setSelectedApplication({ ...selectedApplication, status: value });
                        }}
                        disabled={adminRole === 'admin_view'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="z-[250] bg-white">
                          <SelectItem value="pending">Pending Review</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="hired">Hired</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      {adminRole === 'admin_view' && (
                        <p className="text-xs text-gray-500 mt-1">View-only mode: You cannot edit application status</p>
                      )}
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
                      disabled={adminRole === 'admin_view'}
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
                {(adminRole === 'super_admin' || adminRole === 'app_admin' || adminRole === 'admin_fleet') && (
                  <Button
                    className="bg-brand-blue hover:bg-brand-shadeBlue w-full sm:w-auto shadow-md hover:shadow-lg"
                    onClick={() => handleStatusUpdate(selectedApplication.email, selectedApplication.status || 'pending')}
                  >
                    Update Status
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      }

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
              <div className="flex items-center gap-2">
                {selectedReport?.reportId ? (
                  <Badge className="bg-brand-lightTeal text-brand-shadeTeal border-brand-teal">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Complete Report
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-brand-lightBlue text-brand-shadeBlue border-brand-blue">
                    <Eye className="h-3 w-3 mr-1" />
                    Data Snapshot
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const email = selectedReport?.driverEmail || selectedReport?.email;
                    if (email) {
                      window.open(`/admin/print-report/${encodeURIComponent(email)}`, '_blank');
                    }
                  }}
                  className="ml-2 gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6 mt-4">
              {/* Application Summary */}
              <Card className="bg-gradient-to-r from-brand-lightBlue to-white border-brand-lightBlue">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-blue" />
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
                            <TableHead className="font-semibold text-center">AM</TableHead>
                            <TableHead className="font-semibold text-center">PM</TableHead>
                            <TableHead className="font-semibold text-center">NGT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {DAYS_ORDER.filter(day => selectedReport.availability[day]).map((day) => {
                            const slots = selectedReport.availability[day];
                            return (
                              <TableRow key={day} className="hover:bg-gray-50">
                                <TableCell className="font-medium capitalize">{day}</TableCell>
                                <TableCell className="text-center">
                                  {slots.morning ? (
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
                            );
                          })}
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

              {/* Facility Preferences */}
              {selectedReport.facilityPreferences && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Facility Preferences
                    </CardTitle>
                    <CardDescription>Facility locations the driver is comfortable working with</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedReport.facilityPreferences.selectedFacilities && selectedReport.facilityPreferences.selectedFacilities.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Selected Facilities ({selectedReport.facilityPreferences.selectedFacilities.length}):
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.facilityPreferences.selectedFacilities.map((facility, index) => (
                              <Badge key={index} variant="outline" className="text-sm">
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

                      <div className="pt-2 border-t flex items-center justify-end gap-2"> Acknowledgement Status:
                        <Badge variant={selectedReport.facilityPreferences.acknowledged ? "default" : "secondary"}
                          className={selectedReport.facilityPreferences.acknowledged ? "bg-green-600" : ""}>
                          {selectedReport.facilityPreferences.acknowledged ? 'Completed' : 'Pending'}
                        </Badge>
                        {selectedReport.facilityPreferences.acknowledgedAt && (
                          <span className="text-xs text-gray-500">
                            {new Date(selectedReport.facilityPreferences.acknowledgedAt).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Health & Safety Information */}
              {selectedReport.healthAndSafety && (selectedReport.healthAndSafety.smokingStatus || selectedReport.healthAndSafety.smokingFitnessCompleted || selectedReport.healthAndSafety.hasPhysicalDifficulties !== null) && (
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
                      {selectedReport.healthAndSafety.hasPhysicalDifficulties !== null && selectedReport.healthAndSafety.hasPhysicalDifficulties !== undefined && (
                        <div className="p-3 rounded-lg border bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full ${!selectedReport.healthAndSafety.hasPhysicalDifficulties
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
                      )}
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
                      {(() => {
                        // Friendly labels for each acknowledgement
                        const labels = {
                          role: 'Driver Role',
                          blockClassification: 'Block Densities',
                          feeStructure: 'Fee Structure',
                          paymentCycleSchedule: 'Payment Cycle & Schedule',
                          routesPolicy: 'Routes & Task Addition',
                          cancellationPolicy: 'Cancellation Policy',
                          liabilities: 'Liabilities'
                        };

                        // Map of acknowledgement keys to their date field names
                        const dateFields = {
                          role: 'roleDate',
                          blockClassification: 'blockClassificationDate',
                          feeStructure: 'feeStructureDate',
                          paymentCycleSchedule: 'paymentCycleScheduleDate',
                          routesPolicy: 'routesPolicyDate',
                          cancellationPolicy: 'cancellationPolicyDate',
                          liabilities: 'liabilitiesDate'
                        };

                        // Use the labels keys to drive the display order and ensure all items are shown
                        // even if they are missing from the acknowledgement data
                        const acknowledgementKeys = Object.keys(labels);

                        return acknowledgementKeys.map((key) => {
                          const value = selectedReport.acknowledgements?.[key];
                          const dateField = dateFields[key];
                          const timestamp = selectedReport.acknowledgements?.[dateField];

                          return (
                            <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                              <div className="flex items-center gap-3 flex-1">
                                {value ? (
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                  </div>
                                ) : (
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <span className="font-medium">
                                    {labels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                                  </span>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {value ? 'Acknowledged and accepted' : 'Not yet acknowledged'}
                                  </p>
                                  {(() => {
                                    // Handle various timestamp formats
                                    // Check if timestamp exists and is not null/undefined
                                    if (timestamp === null || timestamp === undefined || timestamp === '') {
                                      return null;
                                    }

                                    let date;
                                    try {
                                      // Firestore Timestamp object (has toDate method)
                                      if (timestamp && typeof timestamp.toDate === 'function') {
                                        date = timestamp.toDate();
                                      }
                                      // Firestore Timestamp with seconds/nanoseconds (serialized format)
                                      else if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
                                        date = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
                                      }
                                      // Regular Date object
                                      else if (timestamp instanceof Date) {
                                        date = timestamp;
                                      }
                                      // Date string or number (timestamp)
                                      else if (timestamp) {
                                        date = new Date(timestamp);
                                      }

                                      // Validate date
                                      if (!date || isNaN(date.getTime())) {
                                        return null;
                                      }

                                      return (
                                        <p className="text-xs text-gray-400 mt-1">
                                          {date.toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </p>
                                      );
                                    } catch (error) {
                                      console.error('Error formatting timestamp:', error, timestamp);
                                      return null;
                                    }
                                  })()}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={value ? "default" : "secondary"} className={value ? "bg-green-600" : ""}>
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
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Reset Progress Confirmation Dialog */}
      <AlertDialog open={!!applicationToReset} onOpenChange={(open) => !open && setApplicationToReset(null)}>
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
              onClick={() => {
                if (applicationToReset) {
                  handleResetProgress(applicationToReset.email);
                  setApplicationToReset(null);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Reset Progress
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Application Confirmation Dialog */}
      <AlertDialog open={!!applicationToDelete} onOpenChange={(open) => !open && setApplicationToDelete(null)}>
        <AlertDialogContent className="z-[200] border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Application
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 pt-2">
              <div className="space-y-2">
                <p className="font-semibold text-red-600">
                  This action cannot be undone!
                </p>
                <p>
                  Are you sure you want to permanently delete this application for <span className="font-medium">{applicationToDelete?.email}</span>?
                </p>
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-medium text-red-900 mb-1">The following data will be permanently removed:</p>
                  <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                    <li>Application record from Fountain applicants</li>
                    <li>Driver profile and onboarding progress</li>
                    <li>Availability schedule</li>
                    <li>Verification details</li>
                    <li>All associated reports</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (applicationToDelete) {
                  handleDeleteApplication(applicationToDelete?.email);
                  setApplicationToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div >
  );
}
