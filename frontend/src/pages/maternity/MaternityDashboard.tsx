import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { maternityApiService, Pregnancy, MaternityDashboardStats } from '../../services/maternity.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Search, RefreshCw, Baby, Heart, AlertTriangle,
  Clock, Users,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-blue-100 text-blue-800',
  MISCARRIAGE: 'bg-red-100 text-red-800',
  STILLBIRTH: 'bg-gray-100 text-gray-800',
  ECTOPIC: 'bg-orange-100 text-orange-800',
  TERMINATED: 'bg-gray-100 text-gray-800',
};

const riskColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800',
  MODERATE: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-red-100 text-red-800',
};

export default function MaternityDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<MaternityDashboardStats | null>(null);
  const [pregnancies, setPregnancies] = useState<Pregnancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadPregnancies(); }, [statusFilter, riskFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        maternityApiService.getDashboardStats(),
        maternityApiService.getPregnancies({ status: 'ACTIVE', limit: 50 }),
      ]);
      setStats(s);
      setPregnancies(p.pregnancies);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadPregnancies = async () => {
    try {
      const filters: Record<string, any> = { limit: 50 };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (riskFilter !== 'all') filters.riskLevel = riskFilter;
      const result = await maternityApiService.getPregnancies(filters);
      setPregnancies(result.pregnancies);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const filtered = pregnancies.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.patient?.firstName?.toLowerCase().includes(q) ||
      p.patient?.lastName?.toLowerCase().includes(q) ||
      p.patient?.mrn?.toLowerCase().includes(q)
    );
  });

  const getGestationalWeeks = (p: Pregnancy) => {
    if (!p.lmp) return null;
    const lmpDate = new Date(p.lmp);
    const weeks = Math.floor((Date.now() - lmpDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return weeks;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maternity & Obstetrics</h1>
          <p className="text-muted-foreground">ANC, delivery, postnatal care management</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card><CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats.activePregnancies}</p>
            <p className="text-xs text-muted-foreground">Active Pregnancies</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{stats.highRisk}</p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{stats.dueSoon}</p>
            <p className="text-xs text-muted-foreground">Due in 2 Weeks</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Baby className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.deliveriesThisMonth}</p>
            <p className="text-xs text-muted-foreground">Deliveries This Month</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Heart className="h-5 w-5 mx-auto mb-1 text-pink-500" />
            <p className="text-2xl font-bold">{stats.ancVisitsToday}</p>
            <p className="text-xs text-muted-foreground">ANC Visits Today</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient, MRN..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="MISCARRIAGE">Miscarriage</SelectItem>
          </SelectContent>
        </Select>
        <Select value={riskFilter} onValueChange={setRiskFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MODERATE">Moderate</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Pregnancies Table */}
      <Card>
        <CardHeader><CardTitle>Pregnancies ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No pregnancies found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Patient</th>
                    <th className="pb-2 font-medium">G/P</th>
                    <th className="pb-2 font-medium">GA (weeks)</th>
                    <th className="pb-2 font-medium">EDD</th>
                    <th className="pb-2 font-medium">Risk</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Last ANC</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const ga = getGestationalWeeks(p);
                    const lastAnc = p.ancVisits?.[0];
                    return (
                      <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3">
                          <div className="font-medium">{p.patient?.firstName} {p.patient?.lastName}</div>
                          <div className="text-xs text-muted-foreground">{p.patient?.mrn}</div>
                        </td>
                        <td className="py-3">G{p.gravida}P{p.para}</td>
                        <td className="py-3">
                          {ga !== null ? (
                            <span className={ga >= 37 ? 'text-green-600 font-medium' : ga >= 28 ? '' : 'text-orange-600'}>
                              {ga}w
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3 text-xs">
                          {p.edd ? new Date(p.edd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-3">
                          <Badge className={riskColors[p.riskLevel] || ''}>{p.riskLevel}</Badge>
                        </td>
                        <td className="py-3">
                          <Badge className={statusColors[p.status] || ''}>{p.status}</Badge>
                        </td>
                        <td className="py-3 text-xs">
                          {lastAnc ? `Visit ${lastAnc.visitNumber} - ${new Date(lastAnc.visitDate).toLocaleDateString('en-GB')}` : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/maternity/pregnancies/${p.id}`)}>
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
