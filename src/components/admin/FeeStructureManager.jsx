import { useState, useEffect } from "react";
import { adminServices } from "../../lib/admin-services";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import { useToast } from "../../hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, FileText } from "lucide-react";

export default function FeeStructureManager() {
  const { toast } = useToast();
  const [feeStructures, setFeeStructures] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [formData, setFormData] = useState({
    city: '',
    currency: '£',
    blocks: [
      {
        shiftLength: 4,
        minimumFee: 50,
        includedTasks: 12,
        additionalTaskFee: 4.58,
        density: 'high'
      }
    ],
    averageHourlyEarnings: '',
    averagePerTaskEarnings: ''
  });

  useEffect(() => {
    loadFeeStructures();
  }, []);

  const loadFeeStructures = async () => {
    setIsLoading(true);
    try {
      const structures = await adminServices.getAllFeeStructures();
      setFeeStructures(structures);
    } catch (error) {
      console.error('Error loading fee structures:', error);
      toast({
        title: "Error loading fee structures",
        description: "Unable to load fee structures. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      city: '',
      currency: '£',
      blocks: [
        {
          shiftLength: 4,
          minimumFee: 50,
          includedTasks: 12,
          additionalTaskFee: 4.58,
          density: 'high'
        }
      ],
      averageHourlyEarnings: '',
      averagePerTaskEarnings: ''
    });
    setEditingCity(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (cityId, structure) => {
    setFormData({
      city: structure.city,
      currency: structure.currency,
      blocks: structure.blocks || [],
      averageHourlyEarnings: structure.averageHourlyEarnings || '',
      averagePerTaskEarnings: structure.averagePerTaskEarnings || ''
    });
    setEditingCity(cityId);
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

      if (formData.blocks.length === 0) {
        toast({
          title: "Validation error",
          description: "At least one block is required.",
          variant: "destructive",
        });
        return;
      }

      const success = await adminServices.setFeeStructure(formData.city, formData);
      if (success) {
        toast({
          title: "Fee structure saved",
          description: `Fee structure for ${formData.city} has been saved successfully.`,
        });
        setIsDialogOpen(false);
        loadFeeStructures();
      } else {
        toast({
          title: "Save failed",
          description: "Unable to save fee structure. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving fee structure:', error);
      toast({
        title: "Save failed",
        description: "Unable to save fee structure. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (cityId, cityName) => {
    try {
      const success = await adminServices.deleteFeeStructure(cityName);
      if (success) {
        toast({
          title: "Fee structure deleted",
          description: `Fee structure for ${cityName} has been deleted.`,
        });
        loadFeeStructures();
      } else {
        toast({
          title: "Delete failed",
          description: "Unable to delete fee structure. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting fee structure:', error);
      toast({
        title: "Delete failed",
        description: "Unable to delete fee structure. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addBlock = () => {
    setFormData(prev => ({
      ...prev,
      blocks: [...prev.blocks, {
        shiftLength: 4,
        minimumFee: 50,
        includedTasks: 12,
        additionalTaskFee: 4.58,
        density: 'medium'
      }]
    }));
  };

  const removeBlock = (index) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index)
    }));
  };

  const updateBlock = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => 
        i === index ? { ...block, [field]: value } : block
      )
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading fee structures...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Fee Structures</h2>
              <p className="text-sm text-gray-600 mt-1">Manage fee structures for different cities</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Fee Structure
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[200]">
            <DialogHeader>
              <DialogTitle>
                {editingCity ? 'Edit Fee Structure' : 'Create New Fee Structure'}
              </DialogTitle>
              <DialogDescription>
                {editingCity ? 'Update the fee structure for this city' : 'Create a new fee structure for a city'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City Name</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="e.g., Birmingham"
                  />
                </div>
                <div className="relative z-[150]">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={formData.currency} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[250] bg-white">
                      <SelectItem value="£">£ (GBP)</SelectItem>
                      <SelectItem value="$">$ (USD)</SelectItem>
                      <SelectItem value="€">€ (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Earnings Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hourlyEarnings">Average Hourly Earnings</Label>
                  <Input
                    id="hourlyEarnings"
                    value={formData.averageHourlyEarnings}
                    onChange={(e) => setFormData(prev => ({ ...prev, averageHourlyEarnings: e.target.value }))}
                    placeholder="e.g., £12.50–£18+"
                  />
                </div>
                <div>
                  <Label htmlFor="taskEarnings">Average Per Task Earnings</Label>
                  <Input
                    id="taskEarnings"
                    value={formData.averagePerTaskEarnings}
                    onChange={(e) => setFormData(prev => ({ ...prev, averagePerTaskEarnings: e.target.value }))}
                    placeholder="e.g., £4.50–£6.50"
                  />
                </div>
              </div>

              {/* Blocks */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Fee Blocks</Label>
                  <Button variant="outline" size="sm" onClick={addBlock}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Block
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.blocks.map((block, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">Block {index + 1}</CardTitle>
                          {formData.blocks.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeBlock(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="relative z-[150]">
                            <Label>Density</Label>
                            <Select 
                              value={block.density} 
                              onValueChange={(value) => updateBlock(index, 'density', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[250] bg-white">
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Shift Length (hours)</Label>
                            <Input
                              type="number"
                              value={block.shiftLength}
                              onChange={(e) => updateBlock(index, 'shiftLength', parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Minimum Fee</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={block.minimumFee}
                              onChange={(e) => updateBlock(index, 'minimumFee', parseFloat(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Included Tasks</Label>
                            <Input
                              type="number"
                              value={block.includedTasks}
                              onChange={(e) => updateBlock(index, 'includedTasks', parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>Additional Task Fee</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={block.additionalTaskFee}
                              onChange={(e) => updateBlock(index, 'additionalTaskFee', parseFloat(e.target.value))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                {editingCity ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Fee Structures List */}
      <div className="space-y-4">
        {Object.entries(feeStructures).map(([cityId, structure]) => (
          <Card key={cityId} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">{structure.city}</CardTitle>
                  <CardDescription className="mt-1">
                    <span className="inline-flex items-center gap-3 text-sm">
                      <span>Currency: <strong>{structure.currency}</strong></span>
                      <span>•</span>
                      <span>Hourly: <strong>{structure.averageHourlyEarnings}</strong></span>
                      <span>•</span>
                      <span>Per Task: <strong>{structure.averagePerTaskEarnings}</strong></span>
                    </span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(cityId, structure)}
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
                        <AlertDialogTitle>Delete Fee Structure</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete the fee structure for {structure.city}? 
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(cityId, structure.city)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {structure.blocks?.map((block, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <h4 className="font-semibold mb-3 capitalize text-gray-900 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        block.density === 'high' ? 'bg-green-500' : 
                        block.density === 'medium' ? 'bg-yellow-500' : 'bg-orange-500'
                      }`} />
                      {block.density} Density Block
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shift Length:</span>
                        <span className="font-medium">{block.shiftLength}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Minimum Fee:</span>
                        <span className="font-medium">{structure.currency}{block.minimumFee}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Included Tasks:</span>
                        <span className="font-medium">{block.includedTasks}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Additional Task:</span>
                        <span className="font-medium">{structure.currency}{block.additionalTaskFee}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {Object.keys(feeStructures).length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No fee structures found</p>
              <p className="text-sm text-gray-500">Create your first fee structure to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
