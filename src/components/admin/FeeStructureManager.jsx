import { useState, useEffect } from "react";
import { adminServices } from "../../lib/admin-services";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../../components/ui/alert-dialog";
import { useToast } from "../../hooks/use-toast";
import { Plus, Edit, Trash2, Save, X, FileText } from "lucide-react";

// Currency mapping: code -> symbol
const CURRENCY_MAP = {
  'GBP': '£',
  'USD': '$',
  'EUR': '€',
  'SGD': '$'
};

// Reverse mapping: symbol -> code (for backward compatibility)
const SYMBOL_TO_CODE = {
  '£': 'GBP',
  '$': 'USD', // Default to USD for backward compatibility
  '€': 'EUR'
};

// Helper to convert currency code to symbol
const getCurrencySymbol = (code) => {
  return CURRENCY_MAP[code] || code;
};

// Helper to normalize currency (handle both old symbol format and new code format)
const normalizeCurrency = (currency) => {
  // If it's already a symbol, convert to code for internal use
  if (CURRENCY_MAP[currency]) {
    return currency; // Already a code
  }
  return SYMBOL_TO_CODE[currency] || 'GBP'; // Convert symbol to code, default to GBP
};

// Helper to get display currency (always return symbol)
const getDisplayCurrency = (currency) => {
  return getCurrencySymbol(normalizeCurrency(currency));
};

// Helper function to remove trailing '+' from earnings strings
const cleanEarningsString = (earnings) => {
  if (!earnings) return earnings;
  if (typeof earnings === 'string') {
    return earnings.replace(/\+\s*$/, '').trim();
  }
  // If it's an object (for vehicle-specific), return as-is (will be handled per property)
  return earnings;
};

export default function FeeStructureManager() {
  const { toast } = useToast();
  const [feeStructures, setFeeStructures] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState(null);
  const [formData, setFormData] = useState({
    city: '',
    feeType: 'general', // 'general' or 'vehicle-specific'
    currency: 'GBP', // Store as code internally
    blocks: [
      {
        shiftLength: 4,
        minimumFee: 50,
        includedTasks: 12,
        additionalTaskFee: 4.58,
        density: 'high'
      }
    ],
    // For vehicle-specific fees
    vehicleBlocks: {
      van: [],
      car: []
    },
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
      feeType: 'general',
      currency: 'GBP',
      blocks: [
        {
          shiftLength: 4,
          minimumFee: 50,
          includedTasks: 12,
          additionalTaskFee: 4.58,
          density: 'high'
        }
      ],
      vehicleBlocks: {
        van: [],
        car: []
      },
      averageHourlyEarnings: '',
      averagePerTaskEarnings: ''
    });
    setEditingCity(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (cityId, structure) => {
    const feeType = structure.feeType || 'general';
    
    if (feeType === 'vehicle-specific') {
      // Handle vehicle-specific structure
      setFormData({
        city: structure.city,
        feeType: 'vehicle-specific',
        currency: normalizeCurrency(structure.currency),
        blocks: [], // Not used for vehicle-specific
        vehicleBlocks: {
          van: structure.blocks?.van || [],
          car: structure.blocks?.car || []
        },
        averageHourlyEarnings: structure.averageHourlyEarnings || '',
        averagePerTaskEarnings: structure.averagePerTaskEarnings || ''
      });
    } else {
      // Handle general structure
      setFormData({
        city: structure.city,
        feeType: 'general',
        currency: normalizeCurrency(structure.currency),
        blocks: structure.blocks || [],
        vehicleBlocks: {
          van: [],
          car: []
        },
        averageHourlyEarnings: structure.averageHourlyEarnings || '',
        averagePerTaskEarnings: structure.averagePerTaskEarnings || ''
      });
    }
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

      // Validation based on fee type
      if (formData.feeType === 'vehicle-specific') {
        if (!formData.vehicleBlocks.van || formData.vehicleBlocks.van.length === 0) {
          toast({
            title: "Validation error",
            description: "At least one van fee block is required for vehicle-specific fees.",
            variant: "destructive",
          });
          return;
        }
        if (!formData.vehicleBlocks.car || formData.vehicleBlocks.car.length === 0) {
          toast({
            title: "Validation error",
            description: "At least one car fee block is required for vehicle-specific fees.",
            variant: "destructive",
          });
          return;
        }
      } else {
        if (formData.blocks.length === 0) {
          toast({
            title: "Validation error",
            description: "At least one block is required.",
            variant: "destructive",
          });
          return;
        }
      }

      // Prepare data to save based on fee type
      let dataToSave;
      if (formData.feeType === 'vehicle-specific') {
        // Calculate earnings for each vehicle type
        const vanHourly = calculateAverageHourlyEarnings(formData.vehicleBlocks.van, formData.currency);
        const vanPerTask = calculateAveragePerTaskEarnings(formData.vehicleBlocks.van, formData.currency);
        const carHourly = calculateAverageHourlyEarnings(formData.vehicleBlocks.car, formData.currency);
        const carPerTask = calculateAveragePerTaskEarnings(formData.vehicleBlocks.car, formData.currency);

        dataToSave = {
          city: formData.city,
          feeType: 'vehicle-specific',
          currency: getCurrencySymbol(formData.currency),
          blocks: {
            van: formData.vehicleBlocks.van,
            car: formData.vehicleBlocks.car
          },
          averageHourlyEarnings: {
            van: cleanEarningsString(vanHourly),
            car: cleanEarningsString(carHourly)
          },
          averagePerTaskEarnings: {
            van: cleanEarningsString(vanPerTask),
            car: cleanEarningsString(carPerTask)
          }
        };
      } else {
        // General fee structure
        dataToSave = {
          city: formData.city,
          feeType: 'general',
          currency: getCurrencySymbol(formData.currency),
          blocks: formData.blocks,
          averageHourlyEarnings: cleanEarningsString(formData.averageHourlyEarnings),
          averagePerTaskEarnings: cleanEarningsString(formData.averagePerTaskEarnings)
        };
      }

      const success = await adminServices.setFeeStructure(dataToSave.city, dataToSave);
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

  // Vehicle-specific block helpers
  const addVehicleBlock = (vehicleType) => {
    setFormData(prev => ({
      ...prev,
      vehicleBlocks: {
        ...prev.vehicleBlocks,
        [vehicleType]: [...prev.vehicleBlocks[vehicleType], {
          shiftLength: 4,
          minimumFee: 50,
          includedTasks: 12,
          additionalTaskFee: 4.58,
          density: 'medium'
        }]
      }
    }));
  };

  const removeVehicleBlock = (vehicleType, index) => {
    setFormData(prev => ({
      ...prev,
      vehicleBlocks: {
        ...prev.vehicleBlocks,
        [vehicleType]: prev.vehicleBlocks[vehicleType].filter((_, i) => i !== index)
      }
    }));
  };

  const updateVehicleBlock = (vehicleType, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      vehicleBlocks: {
        ...prev.vehicleBlocks,
        [vehicleType]: prev.vehicleBlocks[vehicleType].map((block, i) => 
          i === index ? { ...block, [field]: value } : block
        )
      }
    }));
  };

  // Calculate average hourly earnings from blocks
  const calculateAverageHourlyEarnings = (blocks, currencyCode) => {
    if (!blocks || blocks.length === 0) return '';
    
    const currencySymbol = getCurrencySymbol(currencyCode);
    const hourlyRates = blocks.map(block => {
      if (!block.shiftLength || block.shiftLength === 0) return null;
      const baseHourly = block.minimumFee / block.shiftLength;
      // Estimate max hourly with some extra tasks (assume 50% more tasks than included)
      const estimatedExtraTasks = Math.ceil(block.includedTasks * 0.5);
      const maxHourly = (block.minimumFee + (estimatedExtraTasks * block.additionalTaskFee)) / block.shiftLength;
      return { min: baseHourly, max: maxHourly };
    }).filter(Boolean);

    if (hourlyRates.length === 0) return '';

    const minAvg = hourlyRates.reduce((sum, rate) => sum + rate.min, 0) / hourlyRates.length;
    const maxAvg = hourlyRates.reduce((sum, rate) => sum + rate.max, 0) / hourlyRates.length;

    return `${currencySymbol}${minAvg.toFixed(2)}–${currencySymbol}${maxAvg.toFixed(2)}`;
  };

  // Calculate average per task earnings from blocks
  const calculateAveragePerTaskEarnings = (blocks, currencyCode) => {
    if (!blocks || blocks.length === 0) return '';
    
    const currencySymbol = getCurrencySymbol(currencyCode);
    const taskRates = blocks.map(block => {
      if (!block.includedTasks || block.includedTasks === 0) return null;
      const minPerTask = block.minimumFee / block.includedTasks;
      const maxPerTask = block.additionalTaskFee; // Extra tasks pay this rate
      return { min: minPerTask, max: maxPerTask };
    }).filter(Boolean);

    if (taskRates.length === 0) return '';

    const minAvg = taskRates.reduce((sum, rate) => sum + rate.min, 0) / taskRates.length;
    const maxAvg = taskRates.reduce((sum, rate) => sum + rate.max, 0) / taskRates.length;

    return `${currencySymbol}${minAvg.toFixed(2)}–${currencySymbol}${maxAvg.toFixed(2)}`;
  };

  // Auto-calculate earnings when blocks or currency change
  useEffect(() => {
    if (formData.feeType === 'vehicle-specific') {
      // For vehicle-specific, we calculate on save, not here
      // This effect is mainly for general fees
      return;
    }

    if (formData.blocks && formData.blocks.length > 0) {
      const calculatedHourly = calculateAverageHourlyEarnings(formData.blocks, formData.currency);
      const calculatedPerTask = calculateAveragePerTaskEarnings(formData.blocks, formData.currency);
      
      // Only update if values have changed to avoid unnecessary re-renders
      setFormData(prev => {
        if (prev.averageHourlyEarnings === calculatedHourly && 
            prev.averagePerTaskEarnings === calculatedPerTask) {
          return prev; // No change needed
        }
        return {
          ...prev,
          averageHourlyEarnings: calculatedHourly,
          averagePerTaskEarnings: calculatedPerTask
        };
      });
    } else {
      // Clear earnings if no blocks
      setFormData(prev => ({
        ...prev,
        averageHourlyEarnings: '',
        averagePerTaskEarnings: ''
      }));
    }
  }, [formData.blocks, formData.currency, formData.feeType]);

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
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="z-[250] bg-white">
                      <SelectItem value="GBP">£ (GBP)</SelectItem>
                      <SelectItem value="USD">$ (USD)</SelectItem>
                      <SelectItem value="EUR">€ (EUR)</SelectItem>
                      <SelectItem value="SGD">$ (SGD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Fee Type Selector */}
              <div className="relative z-[150]">
                <Label htmlFor="feeType">Fee Type</Label>
                <Select 
                  value={formData.feeType} 
                  onValueChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      feeType: value,
                      // Reset blocks when switching types
                      blocks: value === 'general' ? (prev.blocks.length > 0 ? prev.blocks : [{
                        shiftLength: 4,
                        minimumFee: 50,
                        includedTasks: 12,
                        additionalTaskFee: 4.58,
                        density: 'high'
                      }]) : [],
                      vehicleBlocks: value === 'vehicle-specific' ? (prev.vehicleBlocks.van.length > 0 || prev.vehicleBlocks.car.length > 0 ? prev.vehicleBlocks : {
                        van: [],
                        car: []
                      }) : { van: [], car: [] }
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee type" />
                  </SelectTrigger>
                  <SelectContent className="z-[250] bg-white">
                    <SelectItem value="general">General Fee</SelectItem>
                    <SelectItem value="vehicle-specific">Vehicle-Specific Fee (Van & Car)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.feeType === 'vehicle-specific' 
                    ? 'Vehicle-specific fees require both van and car fee blocks to be set.'
                    : 'General fee applies to all vehicle types.'}
                </p>
              </div>

              {/* General Fee Blocks */}
              {formData.feeType === 'general' && (
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
              )}

              {/* Vehicle-Specific Fee Blocks */}
              {formData.feeType === 'vehicle-specific' && (
                <div className="space-y-6">
                  {/* Van Fees */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-lg font-semibold">Van Fees</Label>
                      <Button variant="outline" size="sm" onClick={() => addVehicleBlock('van')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Van Block
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {formData.vehicleBlocks.van.map((block, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">Van Block {index + 1}</CardTitle>
                              {formData.vehicleBlocks.van.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeVehicleBlock('van', index)}
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
                                  onValueChange={(value) => updateVehicleBlock('van', index, 'density', value)}
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
                                  onChange={(e) => updateVehicleBlock('van', index, 'shiftLength', parseInt(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Minimum Fee</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={block.minimumFee}
                                  onChange={(e) => updateVehicleBlock('van', index, 'minimumFee', parseFloat(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Included Tasks</Label>
                                <Input
                                  type="number"
                                  value={block.includedTasks}
                                  onChange={(e) => updateVehicleBlock('van', index, 'includedTasks', parseInt(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Additional Task Fee</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={block.additionalTaskFee}
                                  onChange={(e) => updateVehicleBlock('van', index, 'additionalTaskFee', parseFloat(e.target.value))}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {formData.vehicleBlocks.van.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No van blocks added yet. Click "Add Van Block" to get started.</p>
                      )}
                    </div>
                  </div>

                  {/* Car Fees */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-lg font-semibold">Car Fees</Label>
                      <Button variant="outline" size="sm" onClick={() => addVehicleBlock('car')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Car Block
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {formData.vehicleBlocks.car.map((block, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg">Car Block {index + 1}</CardTitle>
                              {formData.vehicleBlocks.car.length > 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeVehicleBlock('car', index)}
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
                                  onValueChange={(value) => updateVehicleBlock('car', index, 'density', value)}
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
                                  onChange={(e) => updateVehicleBlock('car', index, 'shiftLength', parseInt(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Minimum Fee</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={block.minimumFee}
                                  onChange={(e) => updateVehicleBlock('car', index, 'minimumFee', parseFloat(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Included Tasks</Label>
                                <Input
                                  type="number"
                                  value={block.includedTasks}
                                  onChange={(e) => updateVehicleBlock('car', index, 'includedTasks', parseInt(e.target.value))}
                                />
                              </div>
                              <div>
                                <Label>Additional Task Fee</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={block.additionalTaskFee}
                                  onChange={(e) => updateVehicleBlock('car', index, 'additionalTaskFee', parseFloat(e.target.value))}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {formData.vehicleBlocks.car.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">No car blocks added yet. Click "Add Car Block" to get started.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Calculated Earnings Information */}
              {formData.feeType === 'general' && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="hourlyEarnings">Average Hourly Earnings</Label>
                    <Input
                      id="hourlyEarnings"
                      value={formData.averageHourlyEarnings}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Calculated from blocks..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Automatically calculated from block details</p>
                  </div>
                  <div>
                    <Label htmlFor="taskEarnings">Average Per Task Earnings</Label>
                    <Input
                      id="taskEarnings"
                      value={formData.averagePerTaskEarnings}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Calculated from blocks..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Automatically calculated from block details</p>
                  </div>
                </div>
              )}
              {formData.feeType === 'vehicle-specific' && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Earnings will be calculated automatically for each vehicle type when you save.</p>
                </div>
              )}
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
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{structure.city}</CardTitle>
                    {structure.feeType === 'vehicle-specific' ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                        Vehicle-Specific
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">
                        General
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    <span className="inline-flex items-center gap-3 text-sm">
                      <span>Currency: <strong>{getDisplayCurrency(structure.currency)}</strong></span>
                      {structure.feeType === 'vehicle-specific' ? (
                        <>
                          <span>•</span>
                          <span>Van Hourly: <strong>{cleanEarningsString(structure.averageHourlyEarnings?.van) || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Car Hourly: <strong>{cleanEarningsString(structure.averageHourlyEarnings?.car) || 'N/A'}</strong></span>
                        </>
                      ) : (
                        <>
                          <span>•</span>
                          <span>Hourly: <strong>{cleanEarningsString(structure.averageHourlyEarnings)}</strong></span>
                          <span>•</span>
                          <span>Per Task: <strong>{cleanEarningsString(structure.averagePerTaskEarnings)}</strong></span>
                        </>
                      )}
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
              {structure.feeType === 'vehicle-specific' ? (
                <div className="space-y-6">
                  {/* Van Blocks */}
                  <div>
                    <h3 className="text-md font-semibold mb-3 text-gray-900">Van Fees</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {structure.blocks?.van?.map((block, index) => (
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
                              <span className="font-medium">{getDisplayCurrency(structure.currency)}{block.minimumFee}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Included Tasks:</span>
                              <span className="font-medium">{block.includedTasks}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Additional Task:</span>
                              <span className="font-medium">{getDisplayCurrency(structure.currency)}{block.additionalTaskFee}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Car Blocks */}
                  <div>
                    <h3 className="text-md font-semibold mb-3 text-gray-900">Car Fees</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {structure.blocks?.car?.map((block, index) => (
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
                              <span className="font-medium">{getDisplayCurrency(structure.currency)}{block.minimumFee}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Included Tasks:</span>
                              <span className="font-medium">{block.includedTasks}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Additional Task:</span>
                              <span className="font-medium">{getDisplayCurrency(structure.currency)}{block.additionalTaskFee}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
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
                          <span className="font-medium">{getDisplayCurrency(structure.currency)}{block.minimumFee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Included Tasks:</span>
                          <span className="font-medium">{block.includedTasks}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Additional Task:</span>
                          <span className="font-medium">{getDisplayCurrency(structure.currency)}{block.additionalTaskFee}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
