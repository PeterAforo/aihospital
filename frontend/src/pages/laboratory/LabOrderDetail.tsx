import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlaskConical, ArrowLeft, User, Calendar, Clock, Beaker, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { laboratoryService, LabWorklistItem } from '@/services/laboratory.service';
import { useToast } from '@/hooks/use-toast';

const LabOrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<LabWorklistItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<Record<string, { value: string; notes: string }>>({});

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const data = await laboratoryService.getOrderResults(orderId!);
      setOrder(data);
      
      // Initialize results state
      const initialResults: Record<string, { value: string; notes: string }> = {};
      data.items.forEach((item) => {
        initialResults[item.id] = {
          value: item.resultValue?.toString() || item.result || '',
          notes: '',
        };
      });
      setResults(initialResults);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load lab order',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultChange = (itemId: string, field: 'value' | 'notes', value: string) => {
    setResults(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSaveResults = async () => {
    if (!order) return;

    try {
      setIsSaving(true);
      
      // Separate panel tests from single tests
      const panelItems: any[] = [];
      const singleResults: any[] = [];

      for (const item of order.items) {
        const hasParameters = (item as any).test?.parameters?.length > 0;
        
        if (hasParameters) {
          // Collect panel test results
          const subResults: any[] = [];
          for (const param of (item as any).test.parameters) {
            const resultKey = `${item.id}-${param.code || param.name}`;
            const resultData = results[resultKey];
            if (resultData?.value && resultData.value.trim() !== '') {
              subResults.push({
                parameterName: param.name,
                parameterCode: param.code,
                resultValue: !isNaN(parseFloat(resultData.value)) ? parseFloat(resultData.value) : undefined,
                result: isNaN(parseFloat(resultData.value)) ? resultData.value : undefined,
                unit: param.unit,
                normalRange: param.normalRange,
              });
            }
          }
          if (subResults.length > 0) {
            panelItems.push({ orderItemId: item.id, subResults });
          }
        } else {
          // Single test result
          const resultData = results[item.id];
          if (resultData?.value && resultData.value.trim() !== '') {
            singleResults.push({
              orderItemId: item.id,
              resultValue: !isNaN(parseFloat(resultData.value)) ? parseFloat(resultData.value) : undefined,
              result: isNaN(parseFloat(resultData.value)) ? resultData.value : undefined,
              notes: resultData.notes,
            });
          }
        }
      }

      if (singleResults.length === 0 && panelItems.length === 0) {
        toast({
          title: 'No Results',
          description: 'Please enter at least one result value',
          variant: 'destructive',
        });
        return;
      }

      console.log('Saving single results:', singleResults);
      console.log('Saving panel results:', panelItems);

      // Save single results
      if (singleResults.length > 0) {
        await laboratoryService.batchEnterResults(singleResults);
      }

      // Save panel results
      for (const panel of panelItems) {
        await laboratoryService.enterPanelResults(panel.orderItemId, panel.subResults);
      }
      
      toast({
        title: 'Success',
        description: `Results saved successfully`,
      });
      
      loadOrder();
    } catch (error: any) {
      console.error('Save results error:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Failed to save results',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCollectSample = async () => {
    if (!order || !order.items[0]) return;

    try {
      setIsSaving(true);
      await laboratoryService.collectSample({
        orderId: order.id,
        orderItemId: order.items[0].id,
        patientId: order.patientId,
        sampleType: order.items[0].test.sampleType,
        notes: '',
      });
      
      toast({
        title: 'Success',
        description: 'Sample collection recorded',
      });
      
      loadOrder();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record sample collection',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyResults = async () => {
    if (!order) return;

    try {
      setIsSaving(true);
      
      // Verify all resulted items
      const verificationPromises = order.items
        .filter(item => item.status === 'RESULTED')
        .map(item => laboratoryService.verifyResult(item.id));
      
      await Promise.all(verificationPromises);
      
      toast({
        title: 'Success',
        description: 'Results verified successfully',
      });
      
      loadOrder();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify results',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'SAMPLE_COLLECTED':
        return <Badge className="bg-blue-500 flex items-center gap-1"><Beaker className="w-3 h-3" />Sample Collected</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-yellow-500 flex items-center gap-1"><FlaskConical className="w-3 h-3" />Processing</Badge>;
      case 'RESULTED':
        return <Badge className="bg-purple-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Awaiting Verification</Badge>;
      case 'VERIFIED':
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Verified</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'STAT':
        return <Badge className="bg-red-500">STAT</Badge>;
      case 'URGENT':
        return <Badge className="bg-orange-500">URGENT</Badge>;
      default:
        return <Badge variant="secondary">ROUTINE</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Lab order not found</p>
            <Button className="mt-4" onClick={() => navigate('/lab/worklist')}>
              Back to Worklist
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/lab/worklist')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="w-7 h-7 text-purple-600" />
              Lab Order Details
            </h1>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge(order.status)}
              {getPriorityBadge(order.priority)}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'PENDING' && (
            <Button onClick={handleCollectSample} disabled={isSaving}>
              <Beaker className="w-4 h-4 mr-2" />
              Collect Sample
            </Button>
          )}
          {(order.status === 'SAMPLE_COLLECTED' || order.status === 'PROCESSING') && (
            <Button onClick={handleSaveResults} disabled={isSaving}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Results'}
            </Button>
          )}
          {order.status === 'RESULTED' && (
            <Button onClick={handleVerifyResults} disabled={isSaving}>
              <CheckCircle className="w-4 h-4 mr-2" />
              {isSaving ? 'Verifying...' : 'Verify Results'}
            </Button>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Patient Name</p>
              <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">MRN</p>
              <p className="font-medium">{order.patient.mrn}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Order Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ordering Physician</p>
              <p className="font-medium">
                {order.encounter?.doctor ? `Dr. ${order.encounter.doctor.firstName} ${order.encounter.doctor.lastName}` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Tests & Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.items.map((item: any) => {
              const hasParameters = item.test.parameters && item.test.parameters.length > 0;
              const hasSubResults = item.subResults && item.subResults.length > 0;
              const isEditable = order.status !== 'COMPLETED' && order.status !== 'PENDING' && item.status !== 'VERIFIED';

              return (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{item.test.name}</h4>
                      <p className="text-sm text-gray-500">
                        Code: {item.test.code}
                        {hasParameters && <span className="ml-2 text-purple-600">(Panel Test - {item.test.parameters.length} parameters)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isAbnormal && (
                        <Badge variant="outline" className="border-orange-500 text-orange-500">
                          Abnormal
                        </Badge>
                      )}
                      {item.isCritical && (
                        <Badge className="bg-red-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Critical
                        </Badge>
                      )}
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {/* Panel Test with multiple parameters */}
                  {hasParameters ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-5 gap-2 text-sm font-medium text-gray-500 border-b pb-2">
                        <div>Parameter</div>
                        <div>Result</div>
                        <div>Unit</div>
                        <div>Reference</div>
                        <div>Status</div>
                      </div>
                      {item.test.parameters.map((param: any) => {
                        const subResult = hasSubResults 
                          ? item.subResults.find((sr: any) => sr.parameterCode === param.code || sr.parameterName === param.name)
                          : null;
                        const resultKey = `${item.id}-${param.code || param.name}`;
                        
                        return (
                          <div key={param.id} className="grid grid-cols-5 gap-2 items-center py-1">
                            <div className="text-sm">
                              <span className="font-medium">{param.name}</span>
                              {param.code && <span className="text-gray-400 ml-1">({param.code})</span>}
                            </div>
                            <div>
                              {isEditable ? (
                                <Input
                                  size={1}
                                  className="h-8 text-sm"
                                  value={results[resultKey]?.value || subResult?.resultValue?.toString() || ''}
                                  onChange={(e) => handleResultChange(resultKey, 'value', e.target.value)}
                                  placeholder="Enter"
                                />
                              ) : (
                                <span className={`text-sm ${subResult?.isAbnormal ? 'text-orange-600 font-medium' : ''}`}>
                                  {subResult?.resultValue ?? subResult?.result ?? '-'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{param.unit || '-'}</div>
                            <div className="text-sm text-gray-500">{param.normalRange || '-'}</div>
                            <div>
                              {subResult ? (
                                <Badge variant={subResult.isAbnormal ? 'destructive' : 'secondary'} className="text-xs">
                                  {subResult.isAbnormal ? 'Abnormal' : 'Normal'}
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400">Pending</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Single result test */
                    isEditable ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`result-${item.id}`}>
                            Result {item.unit && `(${item.unit})`}
                          </Label>
                          <Input
                            id={`result-${item.id}`}
                            value={results[item.id]?.value || ''}
                            onChange={(e) => handleResultChange(item.id, 'value', e.target.value)}
                            placeholder={item.normalRange ? `Ref: ${item.normalRange}` : 'Enter result'}
                          />
                          {item.normalRange && (
                            <p className="text-xs text-gray-500 mt-1">Reference: {item.normalRange}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor={`notes-${item.id}`}>Notes</Label>
                          <Textarea
                            id={`notes-${item.id}`}
                            value={results[item.id]?.notes || ''}
                            onChange={(e) => handleResultChange(item.id, 'notes', e.target.value)}
                            placeholder="Optional notes"
                            rows={1}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 bg-gray-50 p-3 rounded">
                        <div>
                          <p className="text-sm text-gray-500">Result</p>
                          <p className={`font-medium ${item.isAbnormal ? 'text-orange-600' : ''} ${item.isCritical ? 'text-red-600' : ''}`}>
                            {item.resultValue ?? item.result ?? 'Pending'}
                            {item.unit && ` ${item.unit}`}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Reference Range</p>
                          <p className="font-medium">{item.normalRange || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p className="font-medium">{item.status}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabOrderDetail;
