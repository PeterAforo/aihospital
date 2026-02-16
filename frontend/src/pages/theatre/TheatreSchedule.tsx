import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { theatreApiService, Surgery, TheatreDashboardStats, OperatingTheatre } from '../../services/theatre.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Search, RefreshCw, Eye, Clock, CheckCircle, Activity,
  Calendar, AlertTriangle, Building,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  REQUESTED: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  PRE_OP: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  POST_OP: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const urgencyColors: Record<string, string> = {
  ELECTIVE: 'bg-gray-100 text-gray-700',
  URGENT: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};

const theatreStatusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  IN_USE: 'bg-red-100 text-red-800',
  MAINTENANCE: 'bg-gray-100 text-gray-800',
  CLEANING: 'bg-yellow-100 text-yellow-800',
  RESERVED: 'bg-blue-100 text-blue-800',
};

export default function TheatreSchedule() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<TheatreDashboardStats | null>(null);
  const [theatres, setTheatres] = useState<OperatingTheatre[]>([]);
  const [schedule, setSchedule] = useState<Surgery[]>([]);
  const [allSurgeries, setAllSurgeries] = useState<Surgery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState<'schedule' | 'all' | 'theatres'>('schedule');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { if (view === 'schedule') loadSchedule(); }, [view, selectedDate]);
  useEffect(() => { if (view === 'all') loadAllSurgeries(); }, [view, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, t, sch] = await Promise.all([
        theatreApiService.getDashboardStats(),
        theatreApiService.getTheatres(),
        theatreApiService.getSchedule(selectedDate),
      ]);
      setStats(s);
      setTheatres(t);
      setSchedule(sch);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const loadSchedule = async () => {
    try {
      const sch = await theatreApiService.getSchedule(selectedDate);
      setSchedule(sch);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const loadAllSurgeries = async () => {
    try {
      const filters: Record<string, any> = { limit: 50 };
      if (statusFilter !== 'all') filters.status = statusFilter;
      const result = await theatreApiService.getSurgeries(filters);
      setAllSurgeries(result.surgeries);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const displaySurgeries = view === 'schedule' ? schedule : allSurgeries;
  const filtered = displaySurgeries.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.patient?.firstName?.toLowerCase().includes(q) ||
      s.patient?.lastName?.toLowerCase().includes(q) ||
      s.patient?.mrn?.toLowerCase().includes(q) ||
      s.procedureName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Operating Theatre</h1>
          <p className="text-muted-foreground">Surgery scheduling, theatre management & WHO checklist</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="p-4 text-center">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.todaySurgeries}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.scheduled}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.requested}</p>
            <p className="text-xs text-muted-foreground">Requested</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{stats.completedThisMonth}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Building className="h-5 w-5 mx-auto mb-1 text-gray-500" />
            <p className="text-2xl font-bold">{stats.availableTheatres}</p>
            <p className="text-xs text-muted-foreground">Available Theatres</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          <Button variant={view === 'schedule' ? 'default' : 'outline'} size="sm" onClick={() => setView('schedule')}>Schedule</Button>
          <Button variant={view === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setView('all')}>All Surgeries</Button>
          <Button variant={view === 'theatres' ? 'default' : 'outline'} size="sm" onClick={() => setView('theatres')}>Theatres</Button>
        </div>
        {view === 'schedule' && (
          <Input type="date" className="w-44" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        )}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient, procedure..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {view === 'all' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="REQUESTED">Requested</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="PRE_OP">Pre-Op</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="POST_OP">Post-Op</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Theatres View */}
      {view === 'theatres' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {theatres.map(t => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{t.name}</h3>
                  <Badge className={theatreStatusColors[t.status] || ''}>{t.status}</Badge>
                </div>
                {t.code && <p className="text-xs text-muted-foreground">Code: {t.code}</p>}
                {t.theatreType && <p className="text-xs text-muted-foreground">Type: {t.theatreType}</p>}
                {t.floor && <p className="text-xs text-muted-foreground">Floor: {t.floor}</p>}
                {t.notes && <p className="text-xs mt-2">{t.notes}</p>}
              </CardContent>
            </Card>
          ))}
          {theatres.length === 0 && <p className="col-span-3 text-center py-8 text-muted-foreground">No theatres configured</p>}
        </div>
      )}

      {/* Surgeries Table */}
      {view !== 'theatres' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {view === 'schedule' ? `Schedule for ${new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'All Surgeries'}
              {' '}({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No surgeries found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">Patient</th>
                      <th className="pb-2 font-medium">Procedure</th>
                      <th className="pb-2 font-medium">Theatre</th>
                      <th className="pb-2 font-medium">Urgency</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Lead Surgeon</th>
                      <th className="pb-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(surgery => {
                      const lead = surgery.team?.find(m => m.isPrimary);
                      return (
                        <tr key={surgery.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 text-xs">
                            {surgery.scheduledStartTime || '—'}
                            {surgery.scheduledEndTime && ` - ${surgery.scheduledEndTime}`}
                          </td>
                          <td className="py-3">
                            <div className="font-medium">{surgery.patient?.firstName} {surgery.patient?.lastName}</div>
                            <div className="text-xs text-muted-foreground">{surgery.patient?.mrn}</div>
                          </td>
                          <td className="py-3">
                            <div>{surgery.procedureName}</div>
                            <div className="text-xs text-muted-foreground">{surgery.surgeryType?.category} {surgery.laterality ? `(${surgery.laterality})` : ''}</div>
                          </td>
                          <td className="py-3 text-xs">{surgery.theatre?.name || '—'}</td>
                          <td className="py-3">
                            <Badge className={urgencyColors[surgery.urgency] || ''}>{surgery.urgency}</Badge>
                          </td>
                          <td className="py-3">
                            <Badge className={statusColors[surgery.status] || ''}>{surgery.status.replace('_', ' ')}</Badge>
                          </td>
                          <td className="py-3 text-xs">
                            {lead ? `Dr. ${lead.user?.firstName} ${lead.user?.lastName}` : '—'}
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/theatre/surgeries/${surgery.id}`)}>
                              <Eye className="h-4 w-4" />
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
      )}
    </div>
  );
}
