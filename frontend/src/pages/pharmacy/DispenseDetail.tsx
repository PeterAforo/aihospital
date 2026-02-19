import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pill, ArrowLeft, AlertTriangle, Check, User, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { pharmacyService, PrescriptionQueueItem } from '@/services/pharmacy.service';
import { useToast } from '@/hooks/use-toast';

interface DispenseItem {
  prescriptionItemId: string;
  quantityToDispense: number;
  selected: boolean;
}

const DispenseDetail: React.FC = () => {
  const navigate = useNavigate();
  const { prescriptionId } = useParams<{ prescriptionId: string }>();
  const { toast } = useToast();
  const [prescription, setPrescription] = useState<PrescriptionQueueItem | null>(null);
  const [dispenseItems, setDispenseItems] = useState<DispenseItem[]>([]);
  const [counselingNotes, setCounselingNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDispensing, setIsDispensing] = useState(false);

  useEffect(() => {
    if (prescriptionId) {
      loadPrescription();
    }
  }, [prescriptionId]);

  const loadPrescription = async () => {
    try {
      setIsLoading(true);
      const data = await pharmacyService.getPrescriptionDetails(prescriptionId!);
      setPrescription(data);
      
      // Initialize dispense items
      setDispenseItems(
        data.items.map(item => ({
          prescriptionItemId: item.id,
          quantityToDispense: item.quantity - item.dispensedQty,
          selected: item.status !== 'DISPENSED',
        }))
      );
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load prescription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setDispenseItems(prev =>
      prev.map(item =>
        item.prescriptionItemId === itemId
          ? { ...item, quantityToDispense: Math.max(0, quantity) }
          : item
      )
    );
  };

  const handleSelectItem = (itemId: string, selected: boolean) => {
    setDispenseItems(prev =>
      prev.map(item =>
        item.prescriptionItemId === itemId
          ? { ...item, selected }
          : item
      )
    );
  };

  const handleDispense = async () => {
    const itemsToDispense = dispenseItems
      .filter(item => item.selected && item.quantityToDispense > 0)
      .map(item => ({
        prescriptionItemId: item.prescriptionItemId,
        quantityToDispense: item.quantityToDispense,
      }));

    if (itemsToDispense.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to dispense',
        variant: 'destructive',
      });
      return;
    }

    // Check stock availability before sending to backend
    if (prescription) {
      for (const dispItem of itemsToDispense) {
        const prescItem = prescription.items.find(i => i.id === dispItem.prescriptionItemId);
        if (prescItem && prescItem.stockAvailable !== undefined && prescItem.stockAvailable < dispItem.quantityToDispense) {
          toast({
            title: 'Insufficient Stock',
            description: `${prescItem.drug.genericName}: only ${prescItem.stockAvailable} in stock, but ${dispItem.quantityToDispense} requested. Please add stock first.`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    try {
      setIsDispensing(true);
      await pharmacyService.dispensePrescription({
        prescriptionId: prescriptionId!,
        items: itemsToDispense,
        counselingNotes: counselingNotes || undefined,
      });

      toast({
        title: 'Success',
        description: 'Medications dispensed successfully',
      });

      navigate('/pharmacy/queue');
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to dispense medications';
      toast({
        title: 'Dispensing Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsDispensing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <p className="text-gray-500">Loading prescription...</p>
      </div>
    );
  }

  if (!prescription) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Prescription not found</p>
        <Button variant="outline" onClick={() => navigate('/pharmacy/queue')} className="mt-4">
          Back to Queue
        </Button>
      </div>
    );
  }

  const patient = prescription.patient;
  const hasAllergies = patient.allergies && patient.allergies.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pharmacy/queue')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Pill className="w-7 h-7 text-green-600" />
              Dispense Medication
            </h1>
            <p className="text-gray-500">Prescription #{prescriptionId?.slice(0, 8)}</p>
          </div>
        </div>
        <Badge variant={prescription.status === 'PENDING' ? 'secondary' : 'outline'}>
          {prescription.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Patient Info & Items */}
        <div className="col-span-2 space-y-6">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">MRN</p>
                  <p className="font-medium">{patient.mrn}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">{new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{patient.gender}</p>
                </div>
              </div>

              {hasAllergies && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    Allergies
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {patient.allergies.map((allergy, idx) => (
                      <Badge key={idx} variant="destructive">
                        {allergy.allergen} ({allergy.severity})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prescription Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prescription Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prescription.items.map((item) => {
                  const dispenseItem = dispenseItems.find(d => d.prescriptionItemId === item.id);
                  const remaining = item.quantity - item.dispensedQty;
                  const isFullyDispensed = item.status === 'DISPENSED';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg ${isFullyDispensed ? 'bg-gray-50 opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={dispenseItem?.selected || false}
                          onCheckedChange={(checked: boolean) => handleSelectItem(item.id, checked)}
                          disabled={isFullyDispensed}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                {item.drug.genericName}
                                {item.drug.brandName && ` (${item.drug.brandName})`}
                              </p>
                              <p className="text-sm text-gray-500">
                                {item.drug.strength} • {item.drug.form}
                              </p>
                            </div>
                            {isFullyDispensed && (
                              <Badge className="bg-green-500">
                                <Check className="w-3 h-3 mr-1" />
                                Dispensed
                              </Badge>
                            )}
                          </div>

                          <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Dosage</p>
                              <p>{item.dosage}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Frequency</p>
                              <p>{item.frequency}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Duration</p>
                              <p>{item.duration}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Prescribed Qty</p>
                              <p>{item.quantity}</p>
                            </div>
                          </div>

                          {!isFullyDispensed && (
                            <div className="mt-3 flex items-center gap-4">
                              <div>
                                <Label className="text-sm">Quantity to Dispense</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  max={remaining}
                                  value={dispenseItem?.quantityToDispense || 0}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                  className="w-24 mt-1"
                                />
                              </div>
                              <div className="text-sm text-gray-500">
                                <p>Already dispensed: {item.dispensedQty}</p>
                                <p>Remaining: {remaining}</p>
                              </div>
                              {item.stockAvailable !== undefined && (
                                <div className={`text-sm ${item.stockAvailable < remaining ? 'text-red-600' : 'text-green-600'}`}>
                                  Stock: {item.stockAvailable}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Prescriber Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prescriber</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">Dr. {prescription.doctor.firstName} {prescription.doctor.lastName}</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                {new Date(prescription.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {new Date(prescription.createdAt).toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>

          {/* Counseling Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Counseling Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any counseling notes or instructions given to the patient..."
                value={counselingNotes}
                onChange={(e) => setCounselingNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleDispense}
                  disabled={isDispensing || dispenseItems.every(i => !i.selected || i.quantityToDispense === 0)}
                >
                  {isDispensing ? 'Dispensing...' : 'Dispense Selected Items'}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/pharmacy/queue')}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DispenseDetail;
