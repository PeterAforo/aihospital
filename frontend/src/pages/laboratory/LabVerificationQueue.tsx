import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { laboratoryService } from '@/services/laboratory.service';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface VerificationItem {
  id: string;
  orderNumber: string;
  patient: {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
  };
  test: {
    id: string;
    name: string;
    code: string;
  };
  status: string;
  priority: string;
  orderDate: string;
  performedBy?: string;
  performedAt?: string;
  resultValue?: number;
  result?: string;
  unit?: string;
  isAbnormal: boolean;
  isCritical: boolean;
}

const LabVerificationQueue: React.FC = () => {
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadVerificationQueue();
  }, []);

  const loadVerificationQueue = async () => {
    try {
      setIsLoading(true);
      // Get worklist filtered by RESULTED status
      const worklist = await laboratoryService.getWorklist({ status: 'RESULTED' });
      
      // Transform to verification items
      const verificationItems: VerificationItem[] = [];
      worklist.forEach((order: any) => {
        order.items.forEach((item: any) => {
          if (item.status === 'RESULTED') {
            verificationItems.push({
              id: item.id,
              orderNumber: order.id,
              patient: order.patient,
              test: item.test,
              status: item.status,
              priority: order.priority,
              orderDate: order.orderDate,
              performedBy: item.performedBy,
              performedAt: item.performedAt,
              resultValue: item.resultValue,
              result: item.result,
              unit: item.unit,
              isAbnormal: item.isAbnormal,
              isCritical: item.isCritical,
            });
          }
        });
      });
      
      setItems(verificationItems);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load verification queue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySelected = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select items to verify',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsVerifying(true);
      
      const verificationPromises = selectedItems.map(itemId => 
        laboratoryService.verifyResult(itemId)
      );
      
      await Promise.all(verificationPromises);
      
      toast({
        title: 'Success',
        description: `${selectedItems.length} result(s) verified successfully`,
      });
      
      setSelectedItems([]);
      loadVerificationQueue();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify results',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
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
        <div className="text-gray-500">Loading verification queue...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="w-7 h-7 text-purple-600" />
            Lab Verification Queue
          </h1>
          <p className="text-gray-500 mt-1">
            {items.length} result(s) awaiting verification
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleVerifySelected}
            disabled={selectedItems.length === 0 || isVerifying}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isVerifying ? 'Verifying...' : `Verify Selected (${selectedItems.length})`}
          </Button>
        </div>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Awaiting Verification</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No results awaiting verification</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === items.length && items.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Performed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {item.patient.firstName} {item.patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{item.patient.mrn}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.test.name}</div>
                        <div className="text-sm text-gray-500">{item.test.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${item.isAbnormal ? 'text-orange-600' : ''} ${item.isCritical ? 'text-red-600' : ''}`}>
                          {item.resultValue ?? item.result ?? '-'}
                          {item.unit && ` ${item.unit}`}
                        </span>
                        {item.isCritical && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {item.performedAt && (
                          <>
                            <div>{new Date(item.performedAt).toLocaleDateString()}</div>
                            <div className="text-gray-500">
                              {new Date(item.performedAt).toLocaleTimeString()}
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-500 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Awaiting Verification
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/lab/order/${item.orderNumber}`)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LabVerificationQueue;
