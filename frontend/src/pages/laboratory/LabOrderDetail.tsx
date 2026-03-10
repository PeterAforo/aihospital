import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlaskConical, ArrowLeft, User, Calendar, Clock, Beaker, CheckCircle, AlertTriangle, Save, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { laboratoryService, LabWorklistItem } from '@/services/laboratory.service';
import PatientAvatar from '@/components/patients/PatientAvatar';
import { useToast } from '@/hooks/use-toast';

// ── Helpers ──

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING': return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    case 'SAMPLE_COLLECTED': return <Badge className="bg-blue-500 flex items-center gap-1"><Beaker className="w-3 h-3" />Sample Collected</Badge>;
    case 'PROCESSING': return <Badge className="bg-yellow-500 flex items-center gap-1"><FlaskConical className="w-3 h-3" />Processing</Badge>;
    case 'RESULTED': return <Badge className="bg-purple-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Awaiting Verification</Badge>;
    case 'VERIFIED': return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Verified</Badge>;
    case 'COMPLETED': return <Badge className="bg-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
    default: return <Badge variant="secondary">{status}</Badge>;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'STAT': return <Badge className="bg-red-500">STAT</Badge>;
    case 'URGENT': return <Badge className="bg-orange-500">URGENT</Badge>;
    default: return <Badge variant="secondary">ROUTINE</Badge>;
  }
};

// ── Per-test result card ──

interface TestResultCardProps {
  item: any;
  orderStatus: string;
  onSaved: () => void;
}

const TestResultCard: React.FC<TestResultCardProps> = ({ item, orderStatus, onSaved }) => {
  const { toast } = useToast();
  const hasParameters = item.test.parameters && item.test.parameters.length > 0;
  const hasSubResults = item.subResults && item.subResults.length > 0;
  const isEditable = orderStatus !== 'COMPLETED' && orderStatus !== 'PENDING' && item.status !== 'VERIFIED';
  const canVerify = item.status === 'RESULTED';

  // State for single-test result
  const [singleValue, setSingleValue] = useState(item.resultValue?.toString() || item.result || '');
  const [singleNotes, setSingleNotes] = useState(item.notes || '');

  // State for panel-test parameters: { [paramKey]: value }
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (hasParameters) {
      for (const param of item.test.parameters) {
        const key = param.code || param.name;
        const existing = hasSubResults
          ? item.subResults.find((sr: any) => sr.parameterCode === param.code || sr.parameterName === param.name)
          : null;
        init[key] = existing?.resultValue?.toString() || existing?.result || '';
      }
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (hasParameters) {
        // Panel test — collect sub-results
        const subResults = item.test.parameters
          .filter((p: any) => {
            const v = paramValues[p.code || p.name];
            return v && v.trim() !== '';
          })
          .map((p: any) => {
            const v = paramValues[p.code || p.name];
            const numVal = parseFloat(v);
            return {
              parameterName: p.name,
              parameterCode: p.code,
              resultValue: !isNaN(numVal) ? numVal : undefined,
              result: isNaN(numVal) ? v : undefined,
              unit: p.unit,
              normalRange: p.normalRange,
            };
          });

        if (subResults.length === 0) {
          toast({ title: 'No values', description: 'Enter at least one parameter result', variant: 'destructive' });
          setSaving(false);
          return;
        }

        await laboratoryService.enterPanelResults(item.id, subResults);
      } else {
        // Single test
        if (!singleValue.trim()) {
          toast({ title: 'No value', description: 'Enter a result value', variant: 'destructive' });
          setSaving(false);
          return;
        }
        const numVal = parseFloat(singleValue);
        await laboratoryService.enterResult({
          orderItemId: item.id,
          resultValue: !isNaN(numVal) ? numVal : undefined,
          result: isNaN(numVal) ? singleValue : undefined,
          notes: singleNotes || undefined,
        });
      }

      toast({ title: 'Saved', description: `Results saved for ${item.test.name}` });
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await laboratoryService.verifyResult(item.id);
      toast({ title: 'Verified', description: `${item.test.name} result verified` });
      onSaved();
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className={item.status === 'VERIFIED' ? 'border-green-200' : ''}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-purple-600" />
              {item.test.name}
              {item.test.code && <span className="text-xs text-gray-400 font-normal ml-1">({item.test.code})</span>}
            </CardTitle>
            {hasParameters && (
              <p className="text-xs text-purple-600 mt-0.5">Panel Test &mdash; {item.test.parameters.length} parameters</p>
            )}
            {item.test.sampleType && (
              <p className="text-xs text-gray-400 mt-0.5">Sample: {item.test.sampleType}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.isAbnormal && <Badge variant="outline" className="border-orange-500 text-orange-500 text-xs">Abnormal</Badge>}
            {item.isCritical && <Badge className="bg-red-500 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Critical</Badge>}
            {getStatusBadge(item.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasParameters ? (
          /* ── Panel test: table of parameters ── */
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2 pr-3 font-medium w-[30%]">Parameter</th>
                    <th className="py-2 pr-3 font-medium w-[25%]">Result</th>
                    <th className="py-2 pr-3 font-medium w-[15%]">Unit</th>
                    <th className="py-2 pr-3 font-medium w-[20%]">Reference Range</th>
                    <th className="py-2 font-medium w-[10%]">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {item.test.parameters.map((param: any) => {
                    const key = param.code || param.name;
                    const subResult = hasSubResults
                      ? item.subResults.find((sr: any) => sr.parameterCode === param.code || sr.parameterName === param.name)
                      : null;

                    return (
                      <tr key={param.id} className="group">
                        <td className="py-2 pr-3">
                          <span className="font-medium">{param.name}</span>
                          {param.code && <span className="text-gray-400 ml-1 text-xs">({param.code})</span>}
                        </td>
                        <td className="py-2 pr-3">
                          {isEditable ? (
                            <Input
                              className="h-8 text-sm"
                              value={paramValues[key] || ''}
                              onChange={(e) => setParamValues(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder="Enter value"
                            />
                          ) : (
                            <span className={`font-medium ${subResult?.isAbnormal ? 'text-orange-600' : ''} ${subResult?.isCritical ? 'text-red-600' : ''}`}>
                              {subResult?.resultValue ?? subResult?.result ?? <span className="text-gray-300">-</span>}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-gray-500">{param.unit || '-'}</td>
                        <td className="py-2 pr-3 text-gray-500">{param.normalRange || '-'}</td>
                        <td className="py-2">
                          {subResult ? (
                            subResult.isAbnormal ? (
                              <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">H/L</span>
                            ) : (
                              <span className="text-xs text-green-600">Normal</span>
                            )
                          ) : (
                            <span className="text-xs text-gray-300">&ndash;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Single test: result + notes ── */
          isEditable ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm">Result {item.test.unit && <span className="text-gray-400">({item.test.unit})</span>}</Label>
                <Input
                  value={singleValue}
                  onChange={(e) => setSingleValue(e.target.value)}
                  placeholder={item.test.normalRange ? `Ref: ${item.test.normalRange}` : 'Enter result'}
                  className="mt-1"
                />
                {item.test.normalRange && (
                  <p className="text-xs text-gray-400 mt-1">Reference: {item.test.normalRange}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm">Notes</Label>
                <Textarea
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  placeholder="Optional clinical notes..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded">
              <div>
                <p className="text-xs text-gray-500">Result</p>
                <p className={`font-medium ${item.isAbnormal ? 'text-orange-600' : ''} ${item.isCritical ? 'text-red-600' : ''}`}>
                  {item.resultValue ?? item.result ?? <span className="text-gray-400">Pending</span>}
                  {item.unit && ` ${item.unit}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reference Range</p>
                <p className="font-medium">{item.normalRange || item.test.normalRange || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Notes</p>
                <p className="font-medium">{item.notes || '-'}</p>
              </div>
            </div>
          )
        )}

        {/* Per-test action buttons */}
        {(isEditable || canVerify) && (
          <div className="flex gap-2 mt-4 pt-3 border-t">
            {isEditable && (
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Saving...' : 'Save Result'}
              </Button>
            )}
            {canVerify && (
              <Button size="sm" variant="outline" onClick={handleVerify} disabled={verifying} className="text-green-700 border-green-300 hover:bg-green-50">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                {verifying ? 'Verifying...' : 'Verify'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Main page ──

const LabOrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<LabWorklistItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const data = await laboratoryService.getOrderResults(orderId!);
      setOrder(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load lab order', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>;
  }

  if (!order) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-8 text-center">
          <p className="text-gray-500">Lab order not found</p>
          <Button className="mt-4" onClick={() => navigate('/lab/worklist')}>Back to Worklist</Button>
        </CardContent></Card>
      </div>
    );
  }

  const resultedCount = order.items.filter((i: any) => ['RESULTED', 'VERIFIED', 'COMPLETED'].includes(i.status)).length;
  const totalCount = order.items.length;

  return (
    <div className="p-6 space-y-6 max-w-[1100px] mx-auto">
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
              <span className="text-xs text-gray-400 ml-2">{resultedCount}/{totalCount} tests resulted</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'PENDING' && (
            <Button onClick={() => navigate(`/lab/collection/${order.id}`)}>
              <Beaker className="w-4 h-4 mr-2" />
              Collect Sample
            </Button>
          )}
        </div>
      </div>

      {/* Patient Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-5 h-5" /> Patient Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <PatientAvatar photoUrl={(order.patient as any).photoUrl} firstName={order.patient.firstName} lastName={order.patient.lastName} size="lg" />
            <div>
              <p className="font-semibold text-lg">{order.patient.firstName} {order.patient.lastName}</p>
              <p className="text-sm text-gray-500 font-mono">{order.patient.mrn}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Patient Name</p>
              <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
            </div>
            <div>
              <p className="text-gray-500">MRN</p>
              <p className="font-medium">{order.patient.mrn}</p>
            </div>
            <div>
              <p className="text-gray-500">Order Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Ordering Physician</p>
              <p className="font-medium">
                {order.encounter?.doctor ? `Dr. ${order.encounter.doctor.firstName} ${order.encounter.doctor.lastName}` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Test Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-purple-600" />
          Tests &amp; Results
          <span className="text-sm font-normal text-gray-400">({totalCount} test{totalCount !== 1 ? 's' : ''})</span>
        </h2>
        {order.items.map((item: any) => (
          <TestResultCard
            key={item.id}
            item={item}
            orderStatus={order.status}
            onSaved={loadOrder}
          />
        ))}
      </div>
    </div>
  );
};

export default LabOrderDetail;
