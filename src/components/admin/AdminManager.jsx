import { useState, useEffect } from "react";
import { adminServices } from "../../lib/admin-services";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { useToast } from "../../hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, Users, Shield, ShieldCheck, Eye, MapPin } from "lucide-react";

const ROLE_CONFIG = {
  super_admin: {
    label: 'Super Admin',
    description: 'Can create, edit, and manage everything including admins',
    icon: ShieldCheck,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  app_admin: {
    label: 'App Admin',
    description: 'Can manage fleet/view admins, view all data, and edit fee structures & facilities',
    icon: Shield,
    color: 'bg-brand-lightBlue text-brand-shadeBlue border-brand-blue'
  },
  admin_fleet: {
    label: 'Fleet Admin',
    description: 'Can approve/reject applications, view fee structure and facilities',
    icon: Shield,
    color: 'bg-brand-lightTeal text-brand-shadeTeal border-brand-teal'
  },
  admin_view: {
    label: 'View Admin',
    description: 'Can view all tables but cannot edit anything',
    icon: Eye,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
};

export default function AdminManager() {
  const { currentUser } = useAdminAuth();
  const { toast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [availableCities, setAvailableCities] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'admin_view',
    accessibleCities: []
  });
  const [currentUserRole, setCurrentUserRole] = useState(null);

  useEffect(() => {
    loadAdmins();
    loadCurrentUserRole();
    checkAndInitializeSuperAdmin();
    loadCities();
  }, [currentUser]);

  const checkAndInitializeSuperAdmin = async () => {
    // Only check if user is authorized (but might not have role yet)
    if (!currentUser?.email) return;

    try {
      const admins = await adminServices.getAllAdmins();

      // If no admins exist and current user is hari@laundryheap.com, auto-initialize
      if (admins.length === 0 && currentUser.email.toLowerCase() === 'hari@laundryheap.com') {
        try {
          await adminServices.initializeSuperAdmin('hari@laundryheap.com', 'Hari');
          toast({
            title: "Super Admin Initialized",
            description: "First super admin has been created successfully.",
          });
          loadAdmins();
          loadCurrentUserRole();
        } catch (error) {
          // Silently fail - might already exist or user doesn't have permission
        }
      }
    } catch (error) {
      // Silently fail - might not have permission yet
    }
  };

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const adminsData = await adminServices.getAllAdmins();
      setAdmins(adminsData);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast({
        title: "Error loading admins",
        description: "Unable to load admins. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const structures = await adminServices.getAllFeeStructures();
      const cities = Object.keys(structures).sort();
      setAvailableCities(cities);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const loadCurrentUserRole = async () => {
    if (!currentUser?.email) return;
    try {
      const admin = await adminServices.getAdminByEmail(currentUser.email);
      setCurrentUserRole(admin?.role || null);
    } catch (error) {
      console.error('Error loading current user role:', error);
    }
  };

  // Allow access if user is hari@laundryheap.com and no admins exist yet (for initial setup)
  const canManageAdmins = currentUserRole === 'super_admin' || currentUserRole === 'app_admin' ||
    (currentUser?.email?.toLowerCase() === 'hari@laundryheap.com' && admins.length === 0);

  // app_admin can only create/manage admin_fleet and admin_view
  const canManageRole = (role) => {
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'app_admin') {
      return role === 'admin_fleet' || role === 'admin_view';
    }
    return false;
  };

  const handleCreateNew = () => {
    setFormData({
      email: '',
      name: '',
      role: 'admin_view',
      accessibleCities: []
    });
    setEditingAdmin(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (admin) => {
    setFormData({
      email: admin.email,
      name: admin.name || '',
      role: admin.role || 'admin_view',
      accessibleCities: admin.accessibleCities || []
    });
    setEditingAdmin(admin.email);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.email.trim()) {
        toast({
          title: "Validation error",
          description: "Email is required.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.name.trim()) {
        toast({
          title: "Validation error",
          description: "Name is required.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.role) {
        toast({
          title: "Validation error",
          description: "Role is required.",
          variant: "destructive",
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: "Validation error",
          description: "Please enter a valid email address.",
          variant: "destructive",
        });
        return;
      }

      await adminServices.setAdmin(formData.email, {
        name: formData.name,
        role: formData.role,
        accessibleCities: formData.accessibleCities
      });

      toast({
        title: "Admin saved",
        description: `Admin ${formData.email} has been ${editingAdmin ? 'updated' : 'created'} successfully.`,
      });
      setIsDialogOpen(false);
      loadAdmins();
      loadCurrentUserRole();
    } catch (error) {
      console.error('Error saving admin:', error);
      toast({
        title: "Save failed",
        description: error.message || "Unable to save admin. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (email, name) => {
    try {
      await adminServices.deleteAdmin(email);
      toast({
        title: "Admin deleted",
        description: `Admin ${name || email} has been deleted.`,
      });
      loadAdmins();
      loadCurrentUserRole();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast({
        title: "Delete failed",
        description: error.message || "Unable to delete admin. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role) => {
    const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin_view;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const toggleCity = (city) => {
    setFormData(prev => {
      const current = prev.accessibleCities || [];
      if (current.includes(city)) {
        return { ...prev, accessibleCities: current.filter(c => c !== city) };
      } else {
        return { ...prev, accessibleCities: [...current, city] };
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading admins...</p>
        </div>
      </div>
    );
  }

  if (!canManageAdmins) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="text-center py-12">
          <ShieldCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only super admins and app admins can manage other admins.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Admin Management</h2>
              <p className="text-sm text-gray-600 mt-1">Manage admin users and their roles</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreateNew} className="bg-brand-blue hover:bg-brand-shadeBlue">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl z-[200]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAdmin ? 'Edit Admin' : 'Create New Admin'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingAdmin ? 'Update the admin information' : 'Add a new admin user'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value.toLowerCase().trim() }))}
                        placeholder="admin@laundryheap.com"
                        disabled={!!editingAdmin}
                      />
                      {editingAdmin && (
                        <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Admin Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent sideOffset={5} className="min-w-[400px] z-[250] bg-white">
                          {currentUserRole === 'super_admin' && (
                            <>
                              <SelectItem value="super_admin">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">Super Admin</div>
                                    <div className="text-xs text-gray-500">Full access, can manage admins</div>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="app_admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  <div>
                                    <div className="font-medium">App Admin</div>
                                    <div className="text-xs text-gray-500">Manage lower admins, view all, edit fees & facilities</div>
                                  </div>
                                </div>
                              </SelectItem>
                            </>
                          )}
                          <SelectItem value="admin_fleet">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              <div>
                                <div className="font-medium">Fleet Admin</div>
                                <div className="text-xs text-gray-500">Can edit fee structure and facilities</div>
                              </div>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin_view">
                            <div className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              <div>
                                <div className="font-medium">View Admin</div>
                                <div className="text-xs text-gray-500">View only, cannot edit</div>
                              </div>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {formData.role === 'super_admin' && (
                        <p className="text-xs text-amber-600 mt-1">
                          ⚠️ Only one super admin is allowed. Creating a new super admin will replace the existing one.
                        </p>
                      )}
                    </div>

                    {(formData.role === 'admin_fleet' || formData.role === 'admin_view') && (
                      <div className="space-y-2">
                        <Label>Accessible Cities</Label>
                        <div className="border rounded-md p-4 max-h-48 overflow-y-auto bg-gray-50">
                          {availableCities.length > 0 ? (
                            <div className="space-y-2">
                              {availableCities.map((city) => (
                                <div key={city} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`city-${city}`}
                                    checked={formData.accessibleCities.includes(city)}
                                    onChange={() => toggleCity(city)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label
                                    htmlFor={`city-${city}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {city}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-2">No active cities found. Create a fee structure first.</p>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {formData.accessibleCities.length === 0
                            ? "Selecting no cities grants access to ALL cities."
                            : `${formData.accessibleCities.length} cities selected.`}
                        </p>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-brand-blue hover:bg-brand-shadeBlue">
                      <Save className="h-4 w-4 mr-2" />
                      {editingAdmin ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Admins ({admins.length})
          </CardTitle>
          <CardDescription>
            Manage admin users and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const config = ROLE_CONFIG[admin.role] || ROLE_CONFIG.admin_view;
                    const isCurrentUser = admin.email === currentUser?.email;
                    const restrictedCities = admin.accessibleCities && admin.accessibleCities.length > 0;

                    return (
                      <TableRow key={admin.email} className={isCurrentUser ? 'bg-blue-50' : ''}>
                        <TableCell className="font-medium">
                          {admin.email}
                          {isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                          )}
                        </TableCell>
                        <TableCell>{admin.name || 'N/A'}</TableCell>
                        <TableCell>{getRoleBadge(admin.role)}</TableCell>
                        <TableCell>
                          {restrictedCities ? (
                            <div className="flex flex-wrap gap-1">
                              {admin.accessibleCities.slice(0, 3).map(city => (
                                <Badge key={city} variant="outline" className="text-xs bg-gray-50">
                                  {city}
                                </Badge>
                              ))}
                              {admin.accessibleCities.length > 3 && (
                                <Badge variant="outline" className="text-xs bg-gray-50">
                                  +{admin.accessibleCities.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 italic">All Cities</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(admin)}
                              disabled={isCurrentUser && admin.role === 'super_admin' || !canManageRole(admin.role)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="bg-brand-pink hover:bg-brand-shadePink text-white"
                                  disabled={isCurrentUser || !canManageRole(admin.role)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Admin</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete admin {admin.name || admin.email}?
                                    This action cannot be undone. They will lose access to the admin panel.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(admin.email, admin.name)}
                                    className="bg-brand-pink hover:bg-brand-shadePink text-white"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No admins found</p>
              <p className="text-sm text-gray-500">Create your first admin to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

