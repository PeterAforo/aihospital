import React, { useState, useEffect } from 'react';
import { FlaskConical, Plus, Search, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { emrService, LabTest, LabOrder } from '@/services/emr.service';
import { useToast } from '@/hooks/use-toast';

interface LabOrderPanelProps {
  encounterId: string;
  patientId: string;
  isEditable: boolean;
}

export const LabOrderPanel: React.FC<LabOrderPanelProps> = ({
  encounterId,
  patientId,
  isEditable,
}) => {
  const { toast } = useToast();
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LabTest[]>([]);
  const [, setIsSearching] = useState(false);
  const [selectedTests, setSelectedTests] = useState<LabTest[]>([]);
  const [priority, setPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadLabOrders();
  }, [encounterId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchLabTests();
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadLabOrders = async () => {
    try {
      setIsLoading(true);
      const orders = await emrService.getLabOrdersByEncounter(encounterId);
      setLabOrders(orders);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load lab orders',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const searchLabTests = async () => {
    try {
      setIsSearching(true);
      const results = await emrService.searchLabTests(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddTest = (test: LabTest) => {
    if (!selectedTests.find(t => t.id === test.id)) {
      setSelectedTests([...selectedTests, test]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveTest = (testId: string) => {
    setSelectedTests(selectedTests.filter(t => t.id !== testId));
  };

  const handleSubmitOrder = async () => {
    if (selectedTests.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one test',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await emrService.createLabOrder({
        encounterId,
        patientId,
        priority,
        notes: notes || undefined,
        tests: selectedTests.map(t => ({ testId: t.id })),
      });

      toast({
        title: 'Success',
        description: 'Lab order created successfully',
      });

      setSelectedTests([]);
      setPriority('ROUTINE');
      setNotes('');
      setShowAddForm(false);
      loadLabOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create lab order',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await emrService.cancelLabOrder(orderId);
      toast({
        title: 'Success',
        description: 'Lab order cancelled',
      });
      loadLabOrders();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel order',
        variant: 'destructive',
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'STAT':
        return <Badge variant="destructive">STAT</Badge>;
      case 'URGENT':
        return <Badge className="bg-orange-500">Urgent</Badge>;
      default:
        return <Badge variant="secondary">Routine</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-blue-500">In Progress</Badge>;
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
          <FlaskConical className="w-5 h-5 text-purple-600" />
          Lab Orders
        </CardTitle>
        {isEditable && !showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Order Lab Test
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Lab Order Form */}
        {showAddForm && (
          <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">New Lab Order</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>

            {/* Search Tests */}
            <div className="relative">
              <Label>Search Lab Tests</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by test name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((test) => (
                    <div
                      key={test.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleAddTest(test)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{test.name}</p>
                          <p className="text-sm text-gray-500">
                            {test.code && <span className="font-mono mr-2">{test.code}</span>}
                            {test.category}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          {test.nhisApproved && (
                            <Badge variant="outline" className="text-green-600 border-green-600">NHIS</Badge>
                          )}
                          {test.cashPrice && (
                            <p className="text-gray-500 mt-1">GH₵{test.cashPrice.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Tests */}
            {selectedTests.length > 0 && (
              <div>
                <Label>Selected Tests ({selectedTests.length})</Label>
                <div className="mt-1 space-y-2">
                  {selectedTests.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-2 bg-white border rounded">
                      <div>
                        <span className="font-medium">{test.name}</span>
                        {test.code && <span className="ml-2 text-sm text-gray-500">({test.code})</span>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveTest(test.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROUTINE">Routine</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="STAT">STAT (Immediate)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>Clinical Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional instructions for the lab..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmitOrder}
              disabled={selectedTests.length === 0 || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Creating Order...' : `Create Lab Order (${selectedTests.length} tests)`}
            </Button>
          </div>
        )}

        {/* Existing Lab Orders */}
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading lab orders...</p>
        ) : labOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No lab orders for this encounter</p>
        ) : (
          <div className="space-y-3">
            {labOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(order.priority)}
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {new Date(order.orderDate).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>{item.test.name}</span>
                      <div className="flex items-center gap-2">
                        {item.isAbnormal && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                        {item.result && (
                          <span className={item.isAbnormal ? 'text-orange-600 font-medium' : ''}>
                            {item.result} {item.unit}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {order.status === 'PENDING' && isEditable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-500"
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    Cancel Order
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
