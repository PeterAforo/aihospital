import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { laboratoryService } from '@/services/laboratory.service';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface LabResult {
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
  result?: string;
  resultValue?: number;
  unit?: string;
  normalRange?: string;
  isAbnormal: boolean;
  isCritical: boolean;
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

const LabResultsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<LabResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');

  useEffect(() => {
    loadLabResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, searchTerm, statusFilter, priorityFilter, dateFilter]);

  const loadLabResults = async () => {
    try {
      setIsLoading(true);
      // Get all lab orders with results
      const worklist = await laboratoryService.getWorklist();
      
      const allResults: LabResult[] = [];
      worklist.forEach(order => {
        order.items.forEach(item => {
          if (item.status !== 'PENDING' && item.status !== 'SAMPLE_COLLECTED') {
            allResults.push({
              id: item.id,
              orderNumber: order.id,
              patient: order.patient,
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
              parameters: (item as any).parameters,
            });
          }
        });
      });
      
      setResults(allResults);
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

  const filterResults = () => {
    let filtered = results;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(result => 
        result.patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.patient.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(result => result.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(result => result.priority === priorityFilter);
    }

    // Date filter
    if (dateFilter !== 'ALL') {
      const today = new Date();
      const filterDate = new Date(today);
      
      switch (dateFilter) {
        case 'TODAY':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(result => new Date(result.orderDate) >= filterDate);
          break;
        case 'WEEK':
          filterDate.setDate(today.getDate() - 7);
          filtered = filtered.filter(result => new Date(result.orderDate) >= filterDate);
          break;
        case 'MONTH':
          filterDate.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(result => new Date(result.orderDate) >= filterDate);
          break;
      }
    }

    setFilteredResults(filtered);
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
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Loading lab results...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-purple-600" />
            Lab Results Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            {filteredResults.length} result(s) found
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2">Search</label>
              <Input
                placeholder="Search by patient, test, or order number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="RESULTED">Awaiting Verification</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="STAT">STAT</SelectItem>
                  <SelectItem value="URGENT">URGENT</SelectItem>
                  <SelectItem value="ROUTINE">ROUTINE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Time</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="WEEK">Last 7 Days</SelectItem>
                  <SelectItem value="MONTH">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lab Results</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResults.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">No lab results found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {result.patient.firstName} {result.patient.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{result.patient.mrn}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{result.test.name}</div>
                        <div className="text-sm text-gray-500">{result.test.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${result.isAbnormal ? 'text-orange-600' : ''} ${result.isCritical ? 'text-red-600' : ''}`}>
                          {result.resultValue ?? result.result ?? '-'}
                          {result.unit && ` ${result.unit}`}
                        </span>
                        {result.isCritical && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(result.priority)}</TableCell>
                    <TableCell>{getStatusBadge(result.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {result.orderDate && (
                          <>
                            <div>{new Date(result.orderDate).toLocaleDateString()}</div>
                            <div className="text-gray-500">
                              {new Date(result.orderDate).toLocaleTimeString()}
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/lab/order/${result.orderNumber}`)}
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

export default LabResultsDashboard;
