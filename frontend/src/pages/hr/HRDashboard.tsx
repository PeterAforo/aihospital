import { useState, useEffect } from 'react';
import { hrApiService, StaffProfile, LeaveRequest, PayrollRecord, HRDashboardStats } from '../../services/hr.service';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Search, RefreshCw, Users, CalendarOff, Clock, Building2, Plus,
  DollarSign, CheckCircle, XCircle, Loader2, UserPlus,
} from 'lucide-react';

const employmentColors: Record<string, string> = {
  FULL_TIME: 'bg-green-100 text-green-800',
  PART_TIME: 'bg-blue-100 text-blue-800',
  CONTRACT: 'bg-orange-100 text-orange-800',
  LOCUM: 'bg-purple-100 text-purple-800',
  INTERN: 'bg-gray-100 text-gray-800',
};

const leaveStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

const payrollStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  GENERATED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  PAID: 'bg-emerald-100 text-emerald-800',
};

export default function HRDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<HRDashboardStats | null>(null);
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [leaveFilter, setLeaveFilter] = useState('all');
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [showGeneratePayroll, setShowGeneratePayroll] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState('');
  const [generatingPayroll, setGeneratingPayroll] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, p, l, pr] = await Promise.all([
        hrApiService.getDashboardStats(),
        hrApiService.getStaffProfiles({ limit: 100 }),
        hrApiService.getLeaveRequests({ limit: 100 }).catch(() => ({ requests: [], total: 0 })),
        hrApiService.getPayrollRecords({ limit: 100 }).catch(() => ({ records: [], total: 0 })),
      ]);
      setStats(s);
      setStaff(p.profiles);
      setLeaveRequests(l.requests);
      setPayrollRecords(pr.records);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const departments = stats?.departmentBreakdown?.map(d => d.department) || [];

  const filteredStaff = staff.filter(s => {
    if (deptFilter !== 'all' && s.department !== deptFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.employeeId?.toLowerCase().includes(q) ||
      s.designation?.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  });

  const filteredLeave = leaveRequests.filter(l => {
    if (leaveFilter !== 'all' && l.status !== leaveFilter) return false;
    return true;
  });

  const handleLeaveAction = async (id: string, status: string) => {
    try {
      await hrApiService.updateLeaveStatus(id, status);
      toast({ title: `Leave ${status.toLowerCase()}` });
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleGeneratePayroll = async () => {
    if (!payrollPeriod) return;
    setGeneratingPayroll(true);
    try {
      const result = await hrApiService.generatePayroll(payrollPeriod);
      toast({ title: 'Payroll Generated', description: `${result.generated} records for ${result.period}` });
      setShowGeneratePayroll(false);
      setPayrollPeriod('');
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setGeneratingPayroll(false); }
  };

  const handleCreateStaff = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingStaff(true);
    const fd = new FormData(e.currentTarget);
    try {
      await hrApiService.createStaffProfile({
        userId: fd.get('userId') as string,
        employeeId: fd.get('employeeId') as string || undefined,
        department: fd.get('department') as string || undefined,
        designation: fd.get('designation') as string || undefined,
        employmentType: fd.get('employmentType') as string || 'FULL_TIME',
        dateOfJoining: fd.get('dateOfJoining') as string || undefined,
        baseSalary: fd.get('baseSalary') ? parseFloat(fd.get('baseSalary') as string) : undefined,
      });
      toast({ title: 'Staff profile created' });
      setShowCreateStaff(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally { setCreatingStaff(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR & Payroll</h1>
          <p className="text-muted-foreground">Staff management, leave tracking & payroll</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{stats.totalStaff}</p>
            <p className="text-xs text-muted-foreground">Total Staff</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <CalendarOff className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-2xl font-bold">{stats.onLeave}</p>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.pendingLeave}</p>
            <p className="text-xs text-muted-foreground">Pending Leave</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Building2 className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <p className="text-2xl font-bold">{departments.length}</p>
            <p className="text-xs text-muted-foreground">Departments</p>
          </CardContent></Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Users size={15} /> Staff Directory
          </TabsTrigger>
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <CalendarOff size={15} /> Leave Management
          </TabsTrigger>
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <DollarSign size={15} /> Payroll
          </TabsTrigger>
        </TabsList>

        {/* ==================== STAFF TAB ==================== */}
        <TabsContent value="overview" className="space-y-4">
          {stats && stats.departmentBreakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Department Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.departmentBreakdown.map(d => (
                    <Badge key={d.department} variant="outline" className="text-xs py-1 px-3">
                      {d.department}: {d.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search employee ID, designation..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowCreateStaff(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Add Staff Profile
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Staff ({filteredStaff.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filteredStaff.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No staff found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Employee ID</th>
                        <th className="pb-2 font-medium">Designation</th>
                        <th className="pb-2 font-medium">Department</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Joined</th>
                        <th className="pb-2 font-medium text-right">Base Salary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map(s => (
                        <tr key={s.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 font-medium">{s.employeeId || '—'}</td>
                          <td className="py-3">{s.designation || '—'}</td>
                          <td className="py-3 text-xs">{s.department || '—'}</td>
                          <td className="py-3">
                            <Badge className={employmentColors[s.employmentType] || ''}>{s.employmentType.replace(/_/g, ' ')}</Badge>
                          </td>
                          <td className="py-3">
                            <Badge className={s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {s.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs">
                            {s.dateOfJoining ? new Date(s.dateOfJoining).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="py-3 text-right text-xs">
                            {s.baseSalary ? `GHS ${s.baseSalary.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== LEAVE TAB ==================== */}
        <TabsContent value="leave" className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={leaveFilter} onValueChange={setLeaveFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader><CardTitle>Leave Requests ({filteredLeave.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filteredLeave.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No leave requests found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Employee</th>
                        <th className="pb-2 font-medium">Department</th>
                        <th className="pb-2 font-medium">Type</th>
                        <th className="pb-2 font-medium">From</th>
                        <th className="pb-2 font-medium">To</th>
                        <th className="pb-2 font-medium">Days</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium">Reason</th>
                        <th className="pb-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeave.map(l => (
                        <tr key={l.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 font-medium">{l.staffProfile?.employeeId || '—'}</td>
                          <td className="py-3 text-xs">{l.staffProfile?.department || '—'}</td>
                          <td className="py-3">{l.leaveType.replace(/_/g, ' ')}</td>
                          <td className="py-3 text-xs">{new Date(l.startDate).toLocaleDateString('en-GB')}</td>
                          <td className="py-3 text-xs">{new Date(l.endDate).toLocaleDateString('en-GB')}</td>
                          <td className="py-3">{l.totalDays}</td>
                          <td className="py-3">
                            <Badge className={leaveStatusColors[l.status] || ''}>{l.status}</Badge>
                          </td>
                          <td className="py-3 text-xs text-muted-foreground max-w-[150px] truncate">{l.reason || '—'}</td>
                          <td className="py-3 text-right">
                            {l.status === 'PENDING' && (
                              <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleLeaveAction(l.id, 'APPROVED')}>
                                  <CheckCircle size={15} />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleLeaveAction(l.id, 'REJECTED')}>
                                  <XCircle size={15} />
                                </Button>
                              </div>
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
        </TabsContent>

        {/* ==================== PAYROLL TAB ==================== */}
        <TabsContent value="payroll" className="space-y-4">
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => setShowGeneratePayroll(true)}>
              <Plus className="h-4 w-4 mr-2" /> Generate Payroll
            </Button>
          </div>

          <Card>
            <CardHeader><CardTitle>Payroll Records ({payrollRecords.length})</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : payrollRecords.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No payroll records yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Generate payroll for a period to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Employee</th>
                        <th className="pb-2 font-medium">Department</th>
                        <th className="pb-2 font-medium">Period</th>
                        <th className="pb-2 font-medium text-right">Base Salary</th>
                        <th className="pb-2 font-medium text-right">Allowances</th>
                        <th className="pb-2 font-medium text-right">Gross</th>
                        <th className="pb-2 font-medium text-right">Deductions</th>
                        <th className="pb-2 font-medium text-right">Net Pay</th>
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRecords.map(pr => {
                        const totalDeductions = (pr.taxDeduction || 0) + (pr.ssnitDeduction || 0) + (pr.otherDeductions || 0);
                        return (
                          <tr key={pr.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="py-3 font-medium">{pr.staffProfile?.employeeId || '—'}</td>
                            <td className="py-3 text-xs">{pr.staffProfile?.department || '—'}</td>
                            <td className="py-3">{pr.period}</td>
                            <td className="py-3 text-right text-xs">GHS {pr.baseSalary.toLocaleString()}</td>
                            <td className="py-3 text-right text-xs">GHS {pr.allowances.toLocaleString()}</td>
                            <td className="py-3 text-right text-xs font-medium">GHS {pr.grossPay.toLocaleString()}</td>
                            <td className="py-3 text-right text-xs text-red-600">GHS {totalDeductions.toLocaleString()}</td>
                            <td className="py-3 text-right text-xs font-bold text-green-700">GHS {pr.netPay.toLocaleString()}</td>
                            <td className="py-3">
                              <Badge className={payrollStatusColors[pr.status] || ''}>{pr.status}</Badge>
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
        </TabsContent>
      </Tabs>

      {/* Generate Payroll Modal */}
      {showGeneratePayroll && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px]">
            <h3 className="text-lg font-semibold mb-4">Generate Payroll</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will generate payroll records for all active staff for the specified period.
            </p>
            <div className="space-y-3">
              <div>
                <Label>Period (e.g., 2025-01)</Label>
                <Input
                  placeholder="YYYY-MM"
                  value={payrollPeriod}
                  onChange={e => setPayrollPeriod(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <Button variant="outline" onClick={() => { setShowGeneratePayroll(false); setPayrollPeriod(''); }}>Cancel</Button>
              <Button onClick={handleGeneratePayroll} disabled={generatingPayroll || !payrollPeriod}>
                {generatingPayroll ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Profile Modal */}
      {showCreateStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[500px] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Staff Profile</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Link a user account to an HR staff profile. The user must already exist in User Management.
            </p>
            <form onSubmit={handleCreateStaff}>
              <div className="space-y-3">
                <div>
                  <Label>User ID *</Label>
                  <Input name="userId" required placeholder="Paste the user's ID from User Management" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Employee ID</Label>
                    <Input name="employeeId" placeholder="e.g., EMP-001" />
                  </div>
                  <div>
                    <Label>Employment Type</Label>
                    <select name="employmentType" defaultValue="FULL_TIME" className="w-full border rounded-md px-3 py-2 text-sm">
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="LOCUM">Locum</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Department</Label>
                    <Input name="department" placeholder="e.g., Emergency" />
                  </div>
                  <div>
                    <Label>Designation</Label>
                    <Input name="designation" placeholder="e.g., Senior Nurse" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Date of Joining</Label>
                    <Input name="dateOfJoining" type="date" />
                  </div>
                  <div>
                    <Label>Base Salary (GHS)</Label>
                    <Input name="baseSalary" type="number" step="0.01" placeholder="0.00" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowCreateStaff(false)}>Cancel</Button>
                <Button type="submit" disabled={creatingStaff}>
                  {creatingStaff ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Create Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
