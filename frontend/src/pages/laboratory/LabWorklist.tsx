import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Search, Clock, CheckCircle, Beaker } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { laboratoryService, LabWorklistItem } from '@/services/laboratory.service';
import { useToast } from '@/hooks/use-toast';

const LabWorklist: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [worklist, setWorklist] = useState<LabWorklistItem[]>([]);
  const [filteredWorklist, setFilteredWorklist] = useState<LabWorklistItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorklist();
  }, []);

  useEffect(() => {
    filterWorklist();
  }, [worklist, searchTerm, statusFilter, priorityFilter]);

  const loadWorklist = async () => {
    try {
      setIsLoading(true);
      const data = await laboratoryService.getWorklist();
      setWorklist(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load worklist',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterWorklist = () => {
    let filtered = worklist;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.patient.firstName.toLowerCase().includes(term) ||
        order.patient.lastName.toLowerCase().includes(term) ||
        order.patient.mrn.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(order => order.priority === priorityFilter);
    }

    setFilteredWorklist(filtered);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'SAMPLE_COLLECTED':
        return <Badge className="bg-blue-500 flex items-center gap-1"><Beaker className="w-3 h-3" />Sample Collected</Badge>;
      case 'PROCESSING':
        return <Badge className="bg-yellow-500 flex items-center gap-1"><FlaskConical className="w-3 h-3" />Processing</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-purple-600" />
            Lab Worklist
          </h1>
          <p className="text-gray-500">{worklist.length} orders</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lab')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by patient name or MRN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SAMPLE_COLLECTED">Sample Collected</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="STAT">STAT</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="ROUTINE">Routine</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Worklist Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : filteredWorklist.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No orders found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorklist.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/lab/order/${order.id}`)}>
                    <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
                        <p className="text-sm text-gray-500">MRN: {order.patient.mrn}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {order.items.slice(0, 3).map((item) => (
                          <Badge key={item.id} variant="outline" className="text-xs">
                            {item.test.code || item.test.name}
                          </Badge>
                        ))}
                        {order.items.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{order.items.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{new Date(order.orderDate).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-500">{new Date(order.orderDate).toLocaleTimeString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {order.status === 'PENDING' && (
                          <Button size="sm" onClick={() => navigate(`/lab/collection/${order.id}`)}>
                            Collect Sample
                          </Button>
                        )}
                        {(order.status === 'SAMPLE_COLLECTED' || order.status === 'PROCESSING') && (
                          <Button size="sm" onClick={() => navigate(`/lab/results/${order.id}`)}>
                            Enter Results
                          </Button>
                        )}
                        {order.status === 'COMPLETED' && (
                          <Button size="sm" variant="outline" onClick={() => navigate(`/lab/results/${order.id}`)}>
                            View Results
                          </Button>
                        )}
                      </div>
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

export default LabWorklist;
