import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { radiologyApiService, RadiologyOrder, DashboardStats } from '../../services/radiology.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Search, RefreshCw, Eye, Clock, CheckCircle,
  Activity, Zap, Calendar, Image,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const urgencyColors: Record<string, string> = {
  ROUTINE: 'bg-gray-100 text-gray-700',
  URGENT: 'bg-orange-100 text-orange-800',
  STAT: 'bg-red-100 text-red-800',
};

export default function RadiologyWorklist() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [worklist, setWorklist] = useState<RadiologyOrder[]>([]);
  const [allOrders, setAllOrders] = useState<RadiologyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'worklist' | 'all'>('worklist');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (view === 'all') loadAllOrders();
  }, [view, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, w] = await Promise.all([
        radiologyApiService.getDashboardStats(),
        radiologyApiService.getWorklist(),
      ]);
      setStats(s);
      setWorklist(w);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadAllOrders = async () => {
    try {
      const filters: Record<string, any> = { limit: 50 };
      if (statusFilter !== 'all') filters.status = statusFilter;
      const result = await radiologyApiService.getOrders(filters);
      setAllOrders(result.orders);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const displayOrders = view === 'worklist' ? worklist : allOrders;
  const filtered = displayOrders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      o.patient?.firstName?.toLowerCase().includes(s) ||
      o.patient?.lastName?.toLowerCase().includes(s) ||
      o.patient?.mrn?.toLowerCase().includes(s) ||
      o.studyType?.toLowerCase().includes(s)
    );
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await radiologyApiService.updateOrderStatus(orderId, newStatus);
      toast({ title: 'Status updated' });
      loadData();
      if (view === 'all') loadAllOrders();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Radiology</h1>
          <p className="text-muted-foreground">Imaging worklist, orders, and reports</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{stats.scheduled}</p>
              <p className="text-xs text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-5 w-5 mx-auto mb-1 text-purple-500" />
              <p className="text-2xl font-bold">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{stats.completedToday}</p>
              <p className="text-xs text-muted-foreground">Completed Today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{stats.statOrders}</p>
              <p className="text-xs text-muted-foreground">STAT Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Image className="h-5 w-5 mx-auto mb-1 text-gray-500" />
              <p className="text-2xl font-bold">{stats.totalToday}</p>
              <p className="text-xs text-muted-foreground">Total Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <Button variant={view === 'worklist' ? 'default' : 'outline'} size="sm" onClick={() => setView('worklist')}>
            Worklist
          </Button>
          <Button variant={view === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setView('all')}>
            All Orders
          </Button>
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient, MRN, study..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {view === 'all' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>{view === 'worklist' ? 'Active Worklist' : 'All Orders'} ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No orders found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Patient</th>
                    <th className="pb-2 font-medium">Study</th>
                    <th className="pb-2 font-medium">Urgency</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Ordered</th>
                    <th className="pb-2 font-medium">Report</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3">
                        <div className="font-medium">{order.patient?.firstName} {order.patient?.lastName}</div>
                        <div className="text-xs text-muted-foreground">{order.patient?.mrn}</div>
                      </td>
                      <td className="py-3">
                        <div>{order.studyRef?.name || order.studyType}</div>
                        <div className="text-xs text-muted-foreground">{order.studyRef?.modality} {order.bodyPart ? `- ${order.bodyPart}` : ''}</div>
                      </td>
                      <td className="py-3">
                        <Badge className={urgencyColors[order.urgency] || ''}>{order.urgency}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge className={statusColors[order.status] || ''}>{order.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="py-3 text-xs">
                        {new Date(order.orderedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3">
                        {order.report ? (
                          <Badge className={order.report.status === 'FINAL' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                            {order.report.status}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/radiology/orders/${order.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {order.status === 'PENDING' && (
                          <Button variant="outline" size="sm" onClick={() => handleStatusChange(order.id, 'IN_PROGRESS')}>
                            Start
                          </Button>
                        )}
                        {order.status === 'IN_PROGRESS' && !order.report && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/radiology/orders/${order.id}`)}>
                            Report
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
