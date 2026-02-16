import { useState, useEffect } from 'react';
import { equipmentApiService, Equipment, EquipmentDashboardStats } from '../../services/equipment.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Search, RefreshCw, CheckCircle, Wrench, XCircle, AlertTriangle, Shield,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  OPERATIONAL: 'bg-green-100 text-green-800',
  UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800',
  OUT_OF_SERVICE: 'bg-red-100 text-red-800',
  DECOMMISSIONED: 'bg-gray-100 text-gray-600',
  IN_STORAGE: 'bg-blue-100 text-blue-800',
};

export default function EquipmentDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<EquipmentDashboardStats | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadEquipment(); }, [statusFilter, categoryFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        equipmentApiService.getDashboardStats(),
        equipmentApiService.getEquipment({ limit: 50 }),
      ]);
      setStats(s);
      setEquipment(e.equipment);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadEquipment = async () => {
    try {
      const filters: Record<string, any> = { limit: 50 };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (categoryFilter !== 'all') filters.category = categoryFilter;
      const result = await equipmentApiService.getEquipment(filters);
      setEquipment(result.equipment);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = equipment.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.name?.toLowerCase().includes(q) ||
      e.assetTag?.toLowerCase().includes(q) ||
      e.serialNumber?.toLowerCase().includes(q) ||
      e.manufacturer?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment & Assets</h1>
          <p className="text-muted-foreground">Track equipment, maintenance schedules & asset management</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card><CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Assets</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{stats.operational}</p>
            <p className="text-xs text-muted-foreground">Operational</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Wrench className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-xl font-bold">{stats.underMaintenance}</p>
            <p className="text-xs text-muted-foreground">Maintenance</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <XCircle className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold">{stats.outOfService}</p>
            <p className="text-xs text-muted-foreground">Out of Service</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-xl font-bold">{stats.maintenanceDue}</p>
            <p className="text-xs text-muted-foreground">Maintenance Due</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Shield className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold">{stats.warrantyExpiring}</p>
            <p className="text-xs text-muted-foreground">Warranty Expiring</p>
          </CardContent></Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name, tag, serial..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="OPERATIONAL">Operational</SelectItem>
            <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
            <SelectItem value="OUT_OF_SERVICE">Out of Service</SelectItem>
            <SelectItem value="IN_STORAGE">In Storage</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="MEDICAL">Medical</SelectItem>
            <SelectItem value="IT">IT</SelectItem>
            <SelectItem value="FURNITURE">Furniture</SelectItem>
            <SelectItem value="VEHICLE">Vehicle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>Equipment ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No equipment found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 font-medium">Asset Tag</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium">Location</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Warranty</th>
                    <th className="pb-2 font-medium text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(eq => (
                    <tr key={eq.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3">
                        <div className="font-medium">{eq.name}</div>
                        <div className="text-xs text-muted-foreground">{eq.manufacturer} {eq.model}</div>
                      </td>
                      <td className="py-3 text-xs">{eq.assetTag || '—'}</td>
                      <td className="py-3 text-xs">{eq.category || '—'}</td>
                      <td className="py-3 text-xs">{eq.location || eq.department || '—'}</td>
                      <td className="py-3">
                        <Badge className={statusColors[eq.status] || ''}>{eq.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="py-3 text-xs">
                        {eq.warrantyExpiry ? new Date(eq.warrantyExpiry).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="py-3 text-right text-xs">
                        {eq.currentValue ? `GHS ${eq.currentValue.toLocaleString()}` : '—'}
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
