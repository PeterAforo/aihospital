import { useState, useEffect } from 'react';
import { emergencyApiService, ERVisit, ERDashboardStats } from '../../services/emergency.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';
import {
  Search, RefreshCw, AlertTriangle, Clock, Activity,
  Users, ArrowRightLeft, Heart,
} from 'lucide-react';

const triageColors: Record<string, string> = {
  RED: 'bg-red-600 text-white',
  ORANGE: 'bg-orange-500 text-white',
  YELLOW: 'bg-yellow-400 text-black',
  GREEN: 'bg-green-500 text-white',
  BLUE: 'bg-blue-400 text-white',
};

const statusColors: Record<string, string> = {
  REGISTERED: 'bg-gray-100 text-gray-800',
  TRIAGED: 'bg-blue-100 text-blue-800',
  AWAITING_DOCTOR: 'bg-yellow-100 text-yellow-800',
  IN_TREATMENT: 'bg-purple-100 text-purple-800',
  OBSERVATION: 'bg-indigo-100 text-indigo-800',
  ADMITTED: 'bg-green-100 text-green-800',
  DISCHARGED: 'bg-gray-100 text-gray-600',
  TRANSFERRED: 'bg-orange-100 text-orange-800',
  LEFT_AMA: 'bg-red-100 text-red-800',
  DECEASED: 'bg-gray-800 text-white',
};

export default function EmergencyBoard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<ERDashboardStats | null>(null);
  const [board, setBoard] = useState<ERVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        emergencyApiService.getDashboardStats(),
        emergencyApiService.getActiveBoard(),
      ]);
      setStats(s);
      setBoard(b);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const filtered = board.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.patient?.firstName?.toLowerCase().includes(q) ||
      v.patient?.lastName?.toLowerCase().includes(q) ||
      v.patient?.mrn?.toLowerCase().includes(q) ||
      v.chiefComplaint?.toLowerCase().includes(q)
    );
  });

  const getWaitTime = (arrivalTime: string) => {
    const mins = Math.floor((Date.now() - new Date(arrivalTime).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Emergency Department</h1>
          <p className="text-muted-foreground">ER tracking board, triage & trauma management</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Card><CardContent className="p-3 text-center">
            <Users className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold">{stats.activePatients}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
            <p className="text-xl font-bold">{stats.awaitingTriage}</p>
            <p className="text-xs text-muted-foreground">Awaiting Triage</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-xl font-bold">{stats.awaitingDoctor}</p>
            <p className="text-xs text-muted-foreground">Awaiting Doctor</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Activity className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold">{stats.inTreatment}</p>
            <p className="text-xs text-muted-foreground">In Treatment</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <Heart className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xl font-bold">{stats.todayTotal}</p>
            <p className="text-xs text-muted-foreground">Today Total</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <ArrowRightLeft className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{stats.todayAdmitted}</p>
            <p className="text-xs text-muted-foreground">Admitted</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <ArrowRightLeft className="h-4 w-4 mx-auto mb-1 text-gray-500" />
            <p className="text-xl font-bold">{stats.todayDischarged}</p>
            <p className="text-xs text-muted-foreground">Discharged</p>
          </CardContent></Card>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search patient, complaint..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Board */}
      <Card>
        <CardHeader><CardTitle>ER Tracking Board ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No active ER patients</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium w-12">Triage</th>
                    <th className="pb-2 font-medium">Patient</th>
                    <th className="pb-2 font-medium">Chief Complaint</th>
                    <th className="pb-2 font-medium">Arrival</th>
                    <th className="pb-2 font-medium">Wait</th>
                    <th className="pb-2 font-medium">Bed</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Trauma</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3">
                        {v.triageCategory ? (
                          <Badge className={`${triageColors[v.triageCategory]} text-xs px-2`}>{v.triageCategory}</Badge>
                        ) : (
                          <Badge className="bg-gray-200 text-gray-600 text-xs">—</Badge>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{v.patient?.firstName} {v.patient?.lastName}</div>
                        <div className="text-xs text-muted-foreground">{v.patient?.mrn} · {v.patient?.gender} · {v.patient?.bloodGroup || ''}</div>
                      </td>
                      <td className="py-3 max-w-48 truncate">{v.chiefComplaint}</td>
                      <td className="py-3 text-xs">
                        {new Date(v.arrivalTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-muted-foreground">{v.arrivalMode || ''}</div>
                      </td>
                      <td className="py-3 text-xs font-medium">{getWaitTime(v.arrivalTime)}</td>
                      <td className="py-3 text-xs">{v.bedLocation || '—'}</td>
                      <td className="py-3">
                        <Badge className={statusColors[v.status] || ''} >{v.status.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="py-3">
                        {v.isTrauma && <Badge className="bg-red-100 text-red-800 text-xs">TRAUMA</Badge>}
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
