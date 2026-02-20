import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface Drug {
  id: string;
  genericName: string;
  brandName?: string;
  strength?: string;
  form?: string;
}

interface ReceiveItem {
  drugId: string;
  drugName: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number;
}

const ReceiveStockPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<ReceiveItem[]>([{
    drugId: '', drugName: '', batchNumber: '', quantity: 0,
    expiryDate: '', costPrice: 0, sellingPrice: 0,
  }]);

  useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/pharmacy/drugs', { params: { limit: 500 } });
      setDrugs(res.data.data || []);
    } catch {
      // Fallback: try loading from stock items
      try {
        const res = await api.get('/pharmacy/stock');
        const stockDrugs = (res.data.data || []).map((s: any) => s.drug).filter(Boolean);
        const unique = Array.from(new Map(stockDrugs.map((d: Drug) => [d.id, d])).values()) as Drug[];
        setDrugs(unique);
      } catch {
        toast({ title: 'Warning', description: 'Could not load drug list. You can still enter drug IDs manually.', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, {
      drugId: '', drugName: '', batchNumber: '', quantity: 0,
      expiryDate: '', costPrice: 0, sellingPrice: 0,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ReceiveItem, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'drugId') {
      const drug = drugs.find(d => d.id === value);
      updated[index].drugName = drug ? `${drug.genericName} ${drug.brandName ? `(${drug.brandName})` : ''}` : '';
    }
    setItems(updated);
  };

  const handleSubmit = async () => {
    const validItems = items.filter(i => i.drugId && i.batchNumber && i.quantity > 0);
    if (validItems.length === 0) {
      return toast({ title: 'Error', description: 'Add at least one valid item with drug, batch number, and quantity', variant: 'destructive' });
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of validItems) {
      try {
        await api.post('/pharmacy/stock/receive', {
          drugId: item.drugId,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          expiryDate: item.expiryDate || undefined,
          costPrice: item.costPrice || undefined,
          sellingPrice: item.sellingPrice || undefined,
        });
        successCount++;
      } catch (error: any) {
        errorCount++;
        toast({ title: 'Error', description: `Failed to receive ${item.drugName || item.drugId}: ${error.response?.data?.error || error.message}`, variant: 'destructive' });
      }
    }

    setIsSaving(false);

    if (successCount > 0) {
      toast({ title: 'Success', description: `${successCount} item(s) received successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}` });
      navigate('/pharmacy/stock');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-7 h-7 text-green-600" />
            Receive Stock
          </h1>
          <p className="text-gray-500">Record incoming stock from suppliers</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/pharmacy/stock')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Stock
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Stock Items
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {items.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4 relative">
              {items.length > 1 && (
                <Button size="sm" variant="ghost" className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  onClick={() => removeItem(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <div className="text-sm font-medium text-gray-500">Item #{index + 1}</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Drug *</Label>
                  <Select value={item.drugId} onValueChange={(v) => updateItem(index, 'drugId', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoading ? 'Loading drugs...' : 'Select drug'} />
                    </SelectTrigger>
                    <SelectContent>
                      {drugs.map(d => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.genericName} {d.brandName ? `(${d.brandName})` : ''} {d.strength || ''} {d.form || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Batch Number *</Label>
                  <Input placeholder="e.g. BATCH-2026-001" value={item.batchNumber}
                    onChange={(e) => updateItem(index, 'batchNumber', e.target.value)} />
                </div>

                <div>
                  <Label>Quantity *</Label>
                  <Input type="number" min="1" placeholder="0" value={item.quantity || ''}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} />
                </div>

                <div>
                  <Label>Expiry Date</Label>
                  <Input type="date" value={item.expiryDate}
                    onChange={(e) => updateItem(index, 'expiryDate', e.target.value)} />
                </div>

                <div>
                  <Label>Cost Price (GHS)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.costPrice || ''}
                    onChange={(e) => updateItem(index, 'costPrice', parseFloat(e.target.value) || 0)} />
                </div>

                <div>
                  <Label>Selling Price (GHS)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={item.sellingPrice || ''}
                    onChange={(e) => updateItem(index, 'sellingPrice', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => navigate('/pharmacy/stock')}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Receiving...' : `Receive ${items.filter(i => i.drugId && i.batchNumber && i.quantity > 0).length} Item(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiveStockPage;
