import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, Search, Eye, LogOut, Activity, Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { inpatientService, AdmissionListItem, DashboardStats } from '@/services/inpatient.service';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ADMITTED: 'bg-blue-100 text-blue-800',
  TRANSFERRED: 'bg-purple-100 text-purple-800',
  DISCHARGED: 'bg-green-100 text-green-800',
  DECEASED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const priorityColors: Record<string, string> = {
  routine: 'text-gray-600', urgent: 'text-orange-600', emergency: 'text-red-600',
};

const AdmissionsPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState<AdmissionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ADMITTED');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const loadAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      const result = await inpatientService.listAdmissions({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        limit: 15,
      });
      setAdmissions(result.admissions);
      setTotal(result.total);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => { loadAdmissions(); }, [loadAdmissions]);

  useEffect(() => {
    inpatientService.getDashboardStats().then(setStats).catch(() => {});
  }, []);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const daysSince = (d: string) => Math.ceil((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Admissions
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage patient admissions, discharges, and transfers</p>
        </div>
        <Button onClick={() => navigate('/inpatient/admit')} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-1" /> New Admission
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><div className="text-2xl font-bold">{stats.totalAdmitted}</div><div className="text-xs text-gray-500">Currently Admitted</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><UserPlus className="w-5 h-5 text-green-600" /></div>
            <div><div className="text-2xl font-bold">{stats.todayAdmissions}</div><div className="text-xs text-gray-500">Today's Admissions</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><LogOut className="w-5 h-5 text-orange-600" /></div>
            <div><div className="text-2xl font-bold">{stats.todayDischarges}</div><div className="text-xs text-gray-500">Today's Discharges</div></div>
          </CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Activity className="w-5 h-5 text-purple-600" /></div>
            <div><div className="text-2xl font-bold">{stats.occupancyRate}%</div><div className="text-xs text-gray-500">Bed Occupancy</div></div>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search by name, MRN, or admission #..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800">
          <option value="">All Statuses</option>
          <option value="ADMITTED">Admitted</option>
          <option value="PENDING">Pending</option>
          <option value="DISCHARGED">Discharged</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="DECEASED">Deceased</option>
        </select>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-3">{total} admission{total !== 1 ? 's' : ''} found</div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Admission #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Ward / Bed</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Admitted</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Days</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Priority</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : admissions.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">No admissions found</td></tr>
            ) : admissions.map(adm => (
              <tr key={adm.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-4 py-3 font-mono text-xs">{adm.admissionNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{adm.patient.firstName} {adm.patient.lastName}</div>
                  <div className="text-xs text-gray-400">{adm.patient.mrn} • {adm.patient.gender}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{adm.ward.name}</div>
                  <div className="text-xs text-gray-400">Bed {adm.bed.bedNumber}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="max-w-[200px] truncate">{adm.primaryDiagnosis || adm.admissionReason}</div>
                </td>
                <td className="px-4 py-3 text-xs">{formatDate(adm.admissionDate)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-semibold ${daysSince(adm.admissionDate) > 7 ? 'text-red-600' : daysSince(adm.admissionDate) > 3 ? 'text-orange-600' : 'text-gray-700'}`}>
                    {daysSince(adm.admissionDate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-medium ${priorityColors[adm.priority] || 'text-gray-600'}`}>
                    {adm.priority.charAt(0).toUpperCase() + adm.priority.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge className={statusColors[adm.status] || 'bg-gray-100'}>{adm.status}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/inpatient/admissions/${adm.id}`)} className="p-1.5 rounded hover:bg-gray-100 text-blue-600" title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 15)}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionsPage;
