import { useState, useEffect } from "react";
import { adminServices } from "../../lib/admin-services";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import { useToast } from "../../hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, FileText } from "lucide-react";

export default function FacilityManager() {
  const { toast } = useToast();
  const { adminRole } = useAdminAuth();
  const [facilities, setFacilities] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [formData, setFormData] = useState({
    city: '',
    facility: '',
    address: ''
  });

  useEffect(() => {
    loadFacilities();
  }, []);

  const loadFacilities = async () => {
    setIsLoading(true);
    try {
      const facilitiesData = await adminServices.getAllFacilities();
      setFacilities(facilitiesData);
    } catch (error) {
      toast({
        title: "Error loading facilities",
        description: "Unable to load facilities. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      city: '',
      facility: '',
      address: ''
    });
    setEditingFacility(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (facility) => {
    setFormData({
      city: facility.city || facility.City,
      facility: facility.facility || facility.Facility,
      address: facility.address || facility.Address
    });
    setEditingFacility(facility.id || facility.Facility);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.city.trim()) {
        toast({
          title: "Validation error",
          description: "City name is required.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.facility.trim()) {
        toast({
          title: "Validation error",
          description: "Facility code is required.",
          variant: "destructive",
        });
        return;
      }

      if (!formData.address.trim()) {
        toast({
          title: "Validation error",
          description: "Address is required.",
          variant: "destructive",
        });
        return;
      }

      const success = await adminServices.setFacility(formData);
      if (success) {
        toast({
          title: "Facility saved",
          description: `Facility ${formData.facility} has been saved successfully.`,
        });
        setIsDialogOpen(false);
        loadFacilities();
      } else {
        toast({
          title: "Save failed",
          description: "Unable to save facility. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Unable to save facility. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (facilityCode, facilityName) => {
    try {
      const success = await adminServices.deleteFacility(facilityCode);
      if (success) {
        toast({
          title: "Facility deleted",
          description: `Facility ${facilityName} has been deleted.`,
        });
        loadFacilities();
      } else {
        toast({
          title: "Delete failed",
          description: "Unable to delete facility. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Unable to delete facility. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading facilities...</p>
        </div>
      </div>
    );
  }

  const cities = Object.keys(facilities).sort();

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Facility Locations</h2>
              <p className="text-sm text-gray-600 mt-1">Manage facility locations for different cities</p>
            </div>
            {(adminRole === 'super_admin' || adminRole === 'app_admin' || adminRole === 'admin_fleet') && (
              <div className="flex gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Facility
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl z-[200]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingFacility ? 'Edit Facility' : 'Create New Facility'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingFacility ? 'Update the facility information' : 'Add a new facility location'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="city">City Name</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="e.g., London"
                      />
                    </div>
                    <div>
                      <Label htmlFor="facility">Facility Code</Label>
                      <Input
                        id="facility"
                        value={formData.facility}
                        onChange={(e) => setFormData(prev => ({ ...prev, facility: e.target.value.toUpperCase() }))}
                        placeholder="e.g., CRT"
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Full address of the facility"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="h-4 w-4 mr-2" />
                      {editingFacility ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Facilities List by City */}
      <div className="space-y-4">
        {cities.length > 0 ? (
          cities.map((city) => (
            <Card key={city} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{city}</CardTitle>
                <CardDescription>
                  {facilities[city].length} {facilities[city].length !== 1 ? 'facilities' : 'facility'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {facilities[city].map((facility) => (
                    <div
                      key={facility.id || facility.Facility}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">
                            {facility.facility || facility.Facility}
                          </span>
                          <span className="text-sm text-gray-600">
                            {facility.address || facility.Address}
                          </span>
                        </div>
                      </div>
                      {(adminRole === 'super_admin' || adminRole === 'app_admin' || adminRole === 'admin_fleet') && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(facility)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Facility</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete facility {facility.facility || facility.Facility} in {city}? 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(facility.id || facility.Facility, facility.facility || facility.Facility)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No facilities found</p>
              <p className="text-sm text-gray-500">Create your first facility to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

