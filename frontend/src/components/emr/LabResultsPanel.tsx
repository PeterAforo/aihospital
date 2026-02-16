import React, { useState, useEffect } from 'react';
import { FlaskConical, AlertTriangle, Clock, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { laboratoryService } from '@/services/laboratory.service';
import { useToast } from '@/hooks/use-toast';

interface LabResultsPanelProps {
  encounterId: string;
  patientId: string;
}

interface LabResult {
  id: string;
  orderNumber: string;
  test: {
    id: string;
    name: string;
    code: string;
  };
  status: string;
  priority: string;
  orderDate: string;
  result?: string;
  resultValue?: number;
  unit?: string;
  normalRange?: string;
  isAbnormal: boolean;
  isCritical: boolean;
  performedAt?: string;
  verifiedAt?: string;
  performedBy?: string;
  verifiedBy?: string;
  parameters?: Array<{
    name: string;
    code: string;
    result?: string;
    resultValue?: number;
    unit?: string;
    normalRange?: string;
    isAbnormal: boolean;
    isCritical: boolean;
  }>;
}

const LabResultsPanel: React.FC<LabResultsPanelProps> = ({ encounterId }) => {
  const [results, setResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLabResults();
  }, [encounterId]);

  const loadLabResults = async () => {
    try {
      setIsLoading(true);
      // Get lab orders for this encounter
      const worklist = await laboratoryService.getWorklist();
      const encounterResults: LabResult[] = [];
      
      worklist.forEach(order => {
        if (order.encounter?.id === encounterId || (order as any).encounterId === encounterId) {
          order.items.forEach((item: any) => {
            if (item.status !== 'PENDING' && item.status !== 'SAMPLE_COLLECTED') {
              encounterResults.push({
                id: item.id,
                orderNumber: order.id,
                test: item.test,
                status: item.status,
                priority: order.priority,
                orderDate: order.orderDate,
                result: item.result,
                resultValue: item.resultValue,
                unit: item.unit,
                normalRange: item.normalRange,
                isAbnormal: item.isAbnormal,
                isCritical: item.isCritical,
                performedAt: item.performedAt,
                verifiedAt: item.verifiedAt,
                performedBy: item.performedBy,
                verifiedBy: item.verifiedBy,
                parameters: item.parameters,
              });
            }
          });
        }
      });
      
      setResults(encounterResults);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load lab results',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSING':
        return <Badge className="bg-yellow-500">Processing</Badge>;
      case 'RESULTED':
        return <Badge className="bg-purple-500">Awaiting Verification</Badge>;
      case 'VERIFIED':
        return <Badge className="bg-green-500">Verified</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-600">Completed</Badge>;
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
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">Loading lab results...</div>
        </CardContent>
      </Card>
    );
  }

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No lab results available</p>
            <p className="text-sm">Results will appear here once they are processed</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <Card key={result.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">{result.test.name}</CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(result.status)}
                  {getPriorityBadge(result.priority)}
                  <span className="text-sm text-gray-500">
                    Ordered: {new Date(result.orderDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {result.status === 'VERIFIED' || result.status === 'COMPLETED' ? (
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Report
                </Button>
              ) : (
                <div className="text-sm text-gray-500">
                  {result.status === 'PROCESSING' && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      In Progress
                    </span>
                  )}
                  {result.status === 'RESULTED' && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Awaiting Verification
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Panel Tests - Show parameters */}
            {result.parameters && result.parameters.length > 0 ? (
              <div>
                <h4 className="font-medium mb-3">Test Results:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Reference Range</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.parameters.map((param, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{param.name}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${param.isAbnormal ? 'text-orange-600' : ''} ${param.isCritical ? 'text-red-600' : ''}`}>
                            {param.resultValue ?? param.result ?? '-'}
                            {param.unit && ` ${param.unit}`}
                          </span>
                          {param.isCritical && (
                            <AlertTriangle className="w-4 h-4 text-red-500 ml-2 inline" />
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">{param.normalRange || '-'}</TableCell>
                        <TableCell>
                          {param.isCritical ? (
                            <Badge className="bg-red-500">Critical</Badge>
                          ) : param.isAbnormal ? (
                            <Badge className="bg-orange-500">Abnormal</Badge>
                          ) : (
                            <Badge variant="outline">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* Single Test - Show result directly */
              <div className="space-y-3">
                {result.status !== 'PROCESSING' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-500">Result:</span>
                      <div className={`font-medium text-lg ${result.isAbnormal ? 'text-orange-600' : ''} ${result.isCritical ? 'text-red-600' : ''}`}>
                        {result.resultValue ?? result.result ?? 'Pending'}
                        {result.unit && ` ${result.unit}`}
                      </div>
                      {result.isCritical && (
                        <div className="flex items-center gap-1 text-red-500 mt-1">
                          <AlertTriangle className="w-4 h-4" />
                          Critical Value
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Reference Range:</span>
                      <div className="font-medium">{result.normalRange || '-'}</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">Status:</span>
                      <div>{getStatusBadge(result.status)}</div>
                    </div>
                  </div>
                )}
                
                {(result.performedAt || result.verifiedAt) && (
                  <div className="border-t pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {result.performedAt && (
                        <div>
                          <span className="text-gray-500">Performed:</span>
                          <div>{new Date(result.performedAt).toLocaleString()}</div>
                          {result.performedBy && <div className="text-gray-600">By: {result.performedBy}</div>}
                        </div>
                      )}
                      {result.verifiedAt && (
                        <div>
                          <span className="text-gray-500">Verified:</span>
                          <div>{new Date(result.verifiedAt).toLocaleString()}</div>
                          {result.verifiedBy && <div className="text-gray-600">By: {result.verifiedBy}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LabResultsPanel;
