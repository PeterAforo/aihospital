import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Beaker, ArrowLeft, User, Calendar, CheckCircle, FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { laboratoryService, LabWorklistItem } from '@/services/laboratory.service';
import { useToast } from '@/hooks/use-toast';

const SAMPLE_TYPES = [
  'Blood', 'Serum', 'Plasma', 'Whole Blood', 'Urine', 'Stool',
  'Sputum', 'CSF', 'Swab', 'Tissue', 'Aspirate', 'Other',
];

const COLLECTION_SITES = [
  'Left Antecubital', 'Right Antecubital', 'Left Hand', 'Right Hand',
  'Fingertip', 'Midstream', 'Catheter', 'Nasopharyngeal', 'Throat',
  'Wound', 'Other',
];

interface ItemCollectionState {
  orderItemId: string;
  testName: string;
  testCode: string;
  defaultSampleType: string;
  sampleType: string;
  collectionSite: string;
  volume: string;
  notes: string;
  collected: boolean;
  alreadyCollected: boolean;
}

const SampleCollectionPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<LabWorklistItem | null>(null);
  const [items, setItems] = useState<ItemCollectionState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    if (orderId) loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const data = await laboratoryService.getOrderResults(orderId!);
      setOrder(data);

      setItems(
        data.items.map((item) => {
          const hasSample = item.samples && item.samples.length > 0;
          const defaultType = item.test.sampleType || 'Blood';
          return {
            orderItemId: item.id,
            testName: item.test.name,
            testCode: item.test.code || '',
            defaultSampleType: defaultType,
            sampleType: defaultType,
            collectionSite: '',
            volume: '',
            notes: '',
            collected: false,
            alreadyCollected: hasSample || item.status !== 'PENDING',
          };
        })
      );
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load lab order', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = (idx: number, field: keyof ItemCollectionState, value: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const handleCollectAll = async () => {
    if (!order) return;

    const toCollect = items.filter(it => !it.alreadyCollected && !it.collected);
    if (toCollect.length === 0) {
      toast({ title: 'Nothing to collect', description: 'All samples have already been collected', variant: 'destructive' });
      return;
    }

    // Validate sample types
    for (const it of toCollect) {
      if (!it.sampleType) {
        toast({ title: 'Missing sample type', description: `Please select a sample type for ${it.testName}`, variant: 'destructive' });
        return;
      }
    }

    setIsCollecting(true);
    let successCount = 0;
    let lastError = '';

    for (const it of toCollect) {
      try {
        await laboratoryService.collectSample({
          orderId: order.id,
          orderItemId: it.orderItemId,
          patientId: order.patientId,
          sampleType: it.sampleType,
          collectionSite: it.collectionSite || undefined,
          volume: it.volume ? parseFloat(it.volume) : undefined,
          notes: it.notes || undefined,
        });
        successCount++;
        setItems(prev =>
          prev.map(x => x.orderItemId === it.orderItemId ? { ...x, collected: true } : x)
        );
      } catch (error: any) {
        lastError = error.response?.data?.error || error.message;
        console.error(`Failed to collect sample for ${it.testName}:`, lastError);
      }
    }

    setIsCollecting(false);

    if (successCount > 0) {
      toast({ title: 'Success', description: `${successCount} sample(s) collected successfully` });
    }
    if (lastError) {
      toast({ title: 'Error', description: lastError, variant: 'destructive' });
    }

    if (successCount === toCollect.length) {
      setTimeout(() => navigate('/lab/worklist'), 1000);
    } else {
      loadOrder();
    }
  };

  const handleCollectSingle = async (idx: number) => {
    if (!order) return;
    const it = items[idx];
    if (!it.sampleType) {
      toast({ title: 'Missing sample type', description: 'Please select a sample type', variant: 'destructive' });
      return;
    }

    setIsCollecting(true);
    try {
      await laboratoryService.collectSample({
        orderId: order.id,
        orderItemId: it.orderItemId,
        patientId: order.patientId,
        sampleType: it.sampleType,
        collectionSite: it.collectionSite || undefined,
        volume: it.volume ? parseFloat(it.volume) : undefined,
        notes: it.notes || undefined,
      });
      setItems(prev =>
        prev.map((x, i) => i === idx ? { ...x, collected: true } : x)
      );
      toast({ title: 'Success', description: `Sample collected for ${it.testName}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.error || error.message, variant: 'destructive' });
    } finally {
      setIsCollecting(false);
    }
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center"><p className="text-gray-500">Loading order...</p></div>;
  }

  if (!order) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Lab order not found</p>
        <Button variant="outline" onClick={() => navigate('/lab/worklist')} className="mt-4">Back to Worklist</Button>
      </div>
    );
  }

  const pendingItems = items.filter(it => !it.alreadyCollected && !it.collected);
  const allDone = pendingItems.length === 0;

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
              <Beaker className="w-7 h-7 text-teal-600" />
              Sample Collection
            </h1>
            <p className="text-sm text-gray-500 mt-1">Collect and label samples for lab testing</p>
          </div>
        </div>
        {!allDone && (
          <Button onClick={handleCollectAll} disabled={isCollecting} className="bg-teal-600 hover:bg-teal-700">
            <CheckCircle className="w-4 h-4 mr-2" />
            {isCollecting ? 'Collecting...' : `Collect All (${pendingItems.length})`}
          </Button>
        )}
      </div>

      {/* Patient & Order Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-5 h-5" /> Patient & Order
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Patient</p>
              <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
            </div>
            <div>
              <p className="text-gray-500">MRN</p>
              <p className="font-medium">{order.patient.mrn}</p>
            </div>
            <div>
              <p className="text-gray-500">Gender / DOB</p>
              <p className="font-medium">{order.patient.gender} &bull; {new Date(order.patient.dateOfBirth).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Order Date</p>
              <p className="font-medium flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(order.orderDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Priority</p>
              <Badge className={order.priority === 'STAT' ? 'bg-red-500' : order.priority === 'URGENT' ? 'bg-orange-500' : 'bg-gray-200 text-gray-700'}>
                {order.priority}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {allDone && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">All samples have been collected for this order.</p>
            <Button variant="outline" onClick={() => navigate('/lab/worklist')} className="mt-3">Back to Worklist</Button>
          </CardContent>
        </Card>
      )}

      {/* Sample Items */}
      {items.map((item, idx) => (
        <Card key={item.orderItemId} className={item.alreadyCollected || item.collected ? 'opacity-60 border-green-200' : ''}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-600" />
                {item.testName}
                {item.testCode && <span className="text-xs text-gray-400 font-normal">({item.testCode})</span>}
              </CardTitle>
              {(item.alreadyCollected || item.collected) ? (
                <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Collected</Badge>
              ) : (
                <Badge variant="outline">Pending</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(item.alreadyCollected || item.collected) ? (
              <p className="text-sm text-green-700">Sample already collected for this test.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Sample Type <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={item.sampleType}
                    onChange={e => updateItem(idx, 'sampleType', e.target.value)}
                    className="w-full border rounded-md p-2 text-sm mt-1 bg-white text-gray-900"
                  >
                    <option value="" className="text-gray-500">Select type...</option>
                    {SAMPLE_TYPES.map(t => (
                      <option key={t} value={t} className="text-gray-900 bg-white">{t}</option>
                    ))}
                  </select>
                  {item.defaultSampleType && (
                    <p className="text-xs text-gray-400 mt-0.5">Default: {item.defaultSampleType}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Collection Site</Label>
                  <select
                    value={item.collectionSite}
                    onChange={e => updateItem(idx, 'collectionSite', e.target.value)}
                    className="w-full border rounded-md p-2 text-sm mt-1 bg-white text-gray-900"
                  >
                    <option value="" className="text-gray-500">Select site...</option>
                    {COLLECTION_SITES.map(s => (
                      <option key={s} value={s} className="text-gray-900 bg-white">{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Volume (mL)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={item.volume}
                    onChange={e => updateItem(idx, 'volume', e.target.value)}
                    placeholder="e.g. 5.0"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={() => handleCollectSingle(idx)}
                    disabled={isCollecting || !item.sampleType}
                    className="bg-teal-600 hover:bg-teal-700 w-full"
                  >
                    <Beaker className="w-4 h-4 mr-1" />
                    Collect
                  </Button>
                </div>
                <div className="col-span-2 md:col-span-4">
                  <Label className="text-sm font-medium">Notes</Label>
                  <Textarea
                    value={item.notes}
                    onChange={e => updateItem(idx, 'notes', e.target.value)}
                    placeholder="Any collection notes (e.g., fasting sample, difficult draw)..."
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SampleCollectionPage;
