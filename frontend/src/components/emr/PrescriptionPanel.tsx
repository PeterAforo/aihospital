import React, { useState, useEffect } from 'react';
import { Pill, Plus, Search, Trash2, Clock, AlertTriangle, ShieldAlert, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { emrService, Drug, Prescription, FrequencyOption, DurationOption, CDSAlert } from '@/services/emr.service';
import { useToast } from '@/hooks/use-toast';

interface PrescriptionPanelProps {
  encounterId: string;
  patientId: string;
  isEditable: boolean;
}

interface PrescriptionItemForm {
  drug: Drug;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
}

export const PrescriptionPanel: React.FC<PrescriptionPanelProps> = ({
  encounterId,
  patientId,
  isEditable,
}) => {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Drug[]>([]);
  const [, setIsSearching] = useState(false);
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemForm[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [frequencies, setFrequencies] = useState<FrequencyOption[]>([]);
  const [durations, setDurations] = useState<DurationOption[]>([]);
  const [cdsAlerts, setCdsAlerts] = useState<CDSAlert[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    loadPrescriptions();
    loadOptions();
  }, [encounterId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchDrugs();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadPrescriptions = async () => {
    try {
      setIsLoading(true);
      const data = await emrService.getPrescriptionsByEncounter(encounterId);
      setPrescriptions(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load prescriptions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const options = await emrService.getPrescriptionOptions();
      setFrequencies(options.frequencies);
      setDurations(options.durations);
    } catch (error) {
      console.error('Failed to load prescription options:', error);
    }
  };

  const searchDrugs = async () => {
    try {
      setIsSearching(true);
      const results = await emrService.searchDrugs(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const runCDSValidation = async (items: PrescriptionItemForm[]) => {
    if (items.length === 0) {
      setCdsAlerts([]);
      return;
    }
    try {
      setIsValidating(true);
      const drugIds = items.map(i => i.drug.id);
      const result = await emrService.validatePrescription(patientId, drugIds);
      setCdsAlerts(result.alerts);
    } catch (error) {
      console.error('CDS validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleAddDrug = (drug: Drug) => {
    if (!prescriptionItems.find(item => item.drug.id === drug.id)) {
      const newItems = [
        ...prescriptionItems,
        {
          drug,
          dosage: drug.strength || '',
          frequency: 'BD',
          duration: '7 days',
          quantity: 14,
          instructions: '',
        },
      ];
      setPrescriptionItems(newItems);
      runCDSValidation(newItems);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveItem = (drugId: string) => {
    const newItems = prescriptionItems.filter(item => item.drug.id !== drugId);
    setPrescriptionItems(newItems);
    runCDSValidation(newItems);
  };

  const handleUpdateItem = (drugId: string, field: keyof PrescriptionItemForm, value: any) => {
    setPrescriptionItems(
      prescriptionItems.map(item =>
        item.drug.id === drugId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSubmitPrescription = async (forceOverride = false) => {
    if (prescriptionItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one medication',
        variant: 'destructive',
      });
      return;
    }

    // Validate all items
    for (const item of prescriptionItems) {
      if (!item.dosage || !item.frequency || !item.duration || item.quantity <= 0) {
        toast({
          title: 'Error',
          description: `Please complete all fields for ${item.drug.genericName}`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Check CDS alerts - block if critical, prompt if warnings
    const hasCritical = cdsAlerts.some(a => a.severity === 'CRITICAL');
    const hasWarnings = cdsAlerts.some(a => a.severity === 'WARNING');

    if (hasCritical) {
      toast({
        title: 'Prescription Blocked',
        description: 'Critical safety alerts must be resolved before prescribing. Remove the flagged medication(s).',
        variant: 'destructive',
      });
      return;
    }

    if (hasWarnings && !forceOverride) {
      setShowAlertModal(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await emrService.createPrescription({
        encounterId,
        patientId,
        notes: overrideReason ? `${notes || ''}\n[CDS Override: ${overrideReason}]`.trim() : (notes || undefined),
        items: prescriptionItems.map(item => ({
          drugId: item.drug.id,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          quantity: item.quantity,
          instructions: item.instructions || undefined,
        })),
      });

      toast({
        title: 'Success',
        description: 'Prescription created successfully',
      });

      setPrescriptionItems([]);
      setCdsAlerts([]);
      setNotes('');
      setOverrideReason('');
      setShowAlertModal(false);
      setShowAddForm(false);
      loadPrescriptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create prescription',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPrescription = async (prescriptionId: string) => {
    try {
      await emrService.cancelPrescription(prescriptionId);
      toast({
        title: 'Success',
        description: 'Prescription cancelled',
      });
      loadPrescriptions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel prescription',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DISPENSED':
        return <Badge className="bg-green-500">Dispensed</Badge>;
      case 'PARTIAL':
        return <Badge className="bg-blue-500">Partial</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-green-600" />
          Prescriptions
        </CardTitle>
        {isEditable && !showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Prescribe
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Prescription Form */}
        {showAddForm && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">New Prescription</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>

            {/* Search Drugs */}
            <div className="relative">
              <Label>Search Medications</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by drug name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((drug) => (
                    <div
                      key={drug.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleAddDrug(drug)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{drug.genericName}</p>
                          <p className="text-sm text-gray-500">
                            {drug.brandName && <span className="mr-2">{drug.brandName}</span>}
                            {drug.strength} {drug.form}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          {drug.nhisApproved && (
                            <Badge variant="outline" className="text-green-600 border-green-600">NHIS</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescription Items */}
            {prescriptionItems.length > 0 && (
              <div className="space-y-4">
                <Label>Medications ({prescriptionItems.length})</Label>
                {prescriptionItems.map((item) => (
                  <div key={item.drug.id} className="p-3 bg-white border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{item.drug.genericName}</p>
                        <p className="text-sm text-gray-500">
                          {item.drug.brandName && `${item.drug.brandName} - `}
                          {item.drug.form}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.drug.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <Label className="text-xs">Dosage</Label>
                        <Input
                          value={item.dosage}
                          onChange={(e) => handleUpdateItem(item.drug.id, 'dosage', e.target.value)}
                          placeholder="e.g., 500mg"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Frequency</Label>
                        <Select
                          value={item.frequency}
                          onValueChange={(v) => handleUpdateItem(item.drug.id, 'frequency', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencies.map((f) => (
                              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Duration</Label>
                        <Select
                          value={item.duration}
                          onValueChange={(v) => handleUpdateItem(item.drug.id, 'duration', v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {durations.map((d) => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(item.drug.id, 'quantity', parseInt(e.target.value) || 0)}
                          min={1}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Instructions (Optional)</Label>
                      <Input
                        value={item.instructions}
                        onChange={(e) => handleUpdateItem(item.drug.id, 'instructions', e.target.value)}
                        placeholder="e.g., Take after meals"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CDS Alerts */}
            {cdsAlerts.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sm font-semibold">
                  <ShieldAlert className="w-4 h-4" />
                  Clinical Decision Support Alerts ({cdsAlerts.length})
                </Label>
                {cdsAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-50 border-red-500 text-red-800'
                        : alert.severity === 'WARNING'
                        ? 'bg-amber-50 border-amber-500 text-amber-800'
                        : 'bg-blue-50 border-blue-500 text-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {alert.severity === 'CRITICAL' ? (
                        <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      ) : alert.severity === 'WARNING' ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{alert.message}</span>
                          <Badge
                            variant="outline"
                            className={
                              alert.severity === 'CRITICAL'
                                ? 'border-red-500 text-red-700 text-xs'
                                : alert.severity === 'WARNING'
                                ? 'border-amber-500 text-amber-700 text-xs'
                                : 'border-blue-500 text-blue-700 text-xs'
                            }
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-xs mt-1 opacity-80">{alert.details}</p>
                        {alert.severity === 'CRITICAL' && (
                          <p className="text-xs mt-1 font-bold">⛔ This medication cannot be prescribed. Remove it to continue.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isValidating && (
              <p className="text-sm text-gray-500 animate-pulse">Checking for drug interactions and allergies...</p>
            )}

            {/* Notes */}
            <div>
              <Label>Prescription Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the pharmacist..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={() => handleSubmitPrescription()}
              disabled={prescriptionItems.length === 0 || isSubmitting || cdsAlerts.some(a => a.severity === 'CRITICAL')}
              className="w-full"
            >
              {isSubmitting ? 'Creating Prescription...' : `Create Prescription (${prescriptionItems.length} items)`}
            </Button>
          </div>
        )}

        {/* CDS Override Modal */}
        {showAlertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
              <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-white" />
                <h3 className="text-lg font-bold text-white">Clinical Safety Warnings</h3>
                <button onClick={() => setShowAlertModal(false)} className="ml-auto text-white hover:text-amber-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  The following warnings were detected. You may proceed with a clinical justification.
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {cdsAlerts
                    .filter(a => a.severity === 'WARNING')
                    .map((alert, idx) => (
                      <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-medium text-sm text-amber-800">{alert.message}</p>
                        <p className="text-xs text-amber-700 mt-1">{alert.details}</p>
                      </div>
                    ))}
                </div>
                <div>
                  <Label className="text-sm font-medium">Override Reason (Required)</Label>
                  <Textarea
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Provide clinical justification for overriding these warnings..."
                    rows={3}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAlertModal(false)}
                  >
                    Go Back & Modify
                  </Button>
                  <Button
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    disabled={!overrideReason.trim() || isSubmitting}
                    onClick={() => handleSubmitPrescription(true)}
                  >
                    {isSubmitting ? 'Creating...' : 'Override & Prescribe'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Existing Prescriptions */}
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading prescriptions...</p>
        ) : prescriptions.length === 0 ? (
          <p className="text-sm text-gray-500">No prescriptions for this encounter</p>
        ) : (
          <div className="space-y-3">
            {prescriptions.map((prescription) => (
              <div key={prescription.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(prescription.status)}
                    {prescription.doctor && (
                      <span className="text-sm text-gray-500">
                        Dr. {prescription.doctor.firstName} {prescription.doctor.lastName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {new Date(prescription.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-2">
                  {prescription.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{item.drug.genericName}</span>
                        <span className="text-gray-500 ml-2">
                          {item.dosage} - {item.frequency} x {item.duration}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Qty: {item.quantity}</span>
                        {item.dispensedQty > 0 && (
                          <Badge variant="outline" className="text-xs">
                            Dispensed: {item.dispensedQty}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {prescription.notes && (
                  <p className="text-sm text-gray-500 mt-2 italic">Note: {prescription.notes}</p>
                )}
                {prescription.status === 'PENDING' && isEditable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-500"
                    onClick={() => handleCancelPrescription(prescription.id)}
                  >
                    Cancel Prescription
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
