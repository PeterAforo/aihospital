import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Clock, Plus, ChevronLeft, ChevronRight, LogIn, LogOut,
  Sun, Moon, Sunset, Phone, Users, Calendar,
} from 'lucide-react';

const SHIFT_TYPES: Record<string, { label: string; color: string; bg: string; icon: any; time: string }> = {
  MORNING: { label: 'Morning', color: '#f59e0b', bg: '#fefce8', icon: Sun, time: '07:00 - 15:00' },
  AFTERNOON: { label: 'Afternoon', color: '#2563eb', bg: '#eff6ff', icon: Sunset, time: '15:00 - 23:00' },
  NIGHT: { label: 'Night', color: '#7c3aed', bg: '#faf5ff', icon: Moon, time: '23:00 - 07:00' },
  ON_CALL: { label: 'On Call', color: '#dc2626', bg: '#fef2f2', icon: Phone, time: '24hr' },
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  SCHEDULED: { bg: '#f3f4f6', color: '#6b7280' },
  CHECKED_IN: { bg: '#f0fdf4', color: '#16a34a' },
  CHECKED_OUT: { bg: '#eff6ff', color: '#2563eb' },
  ABSENT: { bg: '#fef2f2', color: '#dc2626' },
  SWAPPED: { bg: '#fefce8', color: '#ca8a04' },
};

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function fmtDay(d: Date) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function fmtISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function ShiftSchedulingPage() {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ staffProfileId: '', shiftDate: '', shiftType: 'MORNING', department: '' });

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);
  const startDate = fmtISO(weekDates[0]);
  const endDate = fmtISO(weekDates[6]);

  const { data, isLoading } = useQuery({
    queryKey: ['shifts', startDate, endDate],
    queryFn: () => api.get(`/hr/shifts?startDate=${startDate}&endDate=${endDate}`).then(r => r.data),
  });

  const { data: staffData } = useQuery({
    queryKey: ['hr-staff'],
    queryFn: () => api.get('/hr/staff?limit=100').then(r => r.data),
  });

  const shifts: any[] = (data as any)?.data || [];
  const staff: any[] = (staffData as any)?.profiles || [];

  const createMut = useMutation({
    mutationFn: (body: any) => api.post('/hr/shifts', body).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shifts'] }); setShowForm(false); setFormData({ staffProfileId: '', shiftDate: '', shiftType: 'MORNING', department: '' }); },
  });

  const checkInMut = useMutation({
    mutationFn: (id: string) => api.post(`/hr/shifts/${id}/check-in`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });

  const checkOutMut = useMutation({
    mutationFn: (id: string) => api.post(`/hr/shifts/${id}/check-out`).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  });

  // Group shifts by date
  const shiftsByDate: Record<string, any[]> = {};
  for (const s of shifts) {
    const dateKey = new Date(s.shiftDate).toISOString().split('T')[0];
    if (!shiftsByDate[dateKey]) shiftsByDate[dateKey] = [];
    shiftsByDate[dateKey].push(s);
  }

  // Stats
  const totalShifts = shifts.length;
  const checkedIn = shifts.filter(s => s.status === 'CHECKED_IN').length;
  const absent = shifts.filter(s => s.status === 'ABSENT').length;

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Shift Scheduling</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>Staff roster & attendance</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: showForm ? '#f3f4f6' : '#8b5cf6', color: showForm ? '#374151' : 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus style={{ width: 14, height: 14 }} /> {showForm ? 'Cancel' : 'Add Shift'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <StatCard label="Total Shifts" value={totalShifts} icon={Clock} color="#8b5cf6" />
        <StatCard label="Checked In" value={checkedIn} icon={LogIn} color="#16a34a" />
        <StatCard label="Absent" value={absent} icon={LogOut} color="#dc2626" />
        <StatCard label="Staff" value={staff.length} icon={Users} color="#2563eb" />
      </div>

      {/* Add Shift Form */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.75rem' }}>New Shift</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Staff Member</label>
              <select value={formData.staffProfileId} onChange={e => setFormData(f => ({ ...f, staffProfileId: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }}>
                <option value="">Select staff...</option>
                {staff.map((s: any) => <option key={s.id} value={s.id}>{s.employeeId || s.id.slice(0, 8)} - {s.designation || s.department || 'Staff'}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Date</label>
              <input type="date" value={formData.shiftDate} onChange={e => setFormData(f => ({ ...f, shiftDate: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Shift Type</label>
              <select value={formData.shiftType} onChange={e => setFormData(f => ({ ...f, shiftType: e.target.value }))}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }}>
                {Object.entries(SHIFT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.time})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Department</label>
              <input value={formData.department} onChange={e => setFormData(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Nursing"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={() => {
            if (!formData.staffProfileId || !formData.shiftDate) return;
            const st = SHIFT_TYPES[formData.shiftType];
            createMut.mutate({ ...formData, startTime: st.time.split(' - ')[0], endTime: st.time.split(' - ')[1] || '07:00' });
          }} disabled={createMut.isPending}
            style={{ marginTop: '0.75rem', padding: '0.5rem 1.25rem', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
            {createMut.isPending ? 'Creating...' : 'Create Shift'}
          </button>
        </div>
      )}

      {/* Week Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => setWeekOffset(w => w - 1)}
          style={{ padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
          <ChevronLeft style={{ width: 14, height: 14 }} /> Previous Week
        </button>
        <button onClick={() => setWeekOffset(0)}
          style={{ padding: '0.375rem 0.75rem', background: weekOffset === 0 ? '#8b5cf6' : 'white', color: weekOffset === 0 ? 'white' : '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
          This Week
        </button>
        <button onClick={() => setWeekOffset(w => w + 1)}
          style={{ padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}>
          Next Week <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Weekly Grid */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading shifts...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {weekDates.map(date => {
            const dateKey = fmtISO(date);
            const dayShifts = shiftsByDate[dateKey] || [];
            const isToday = fmtISO(new Date()) === dateKey;

            return (
              <div key={dateKey} style={{
                background: 'white', borderRadius: 10, border: isToday ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                overflow: 'hidden', minHeight: 200,
              }}>
                <div style={{
                  padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600,
                  background: isToday ? '#8b5cf6' : '#f9fafb', color: isToday ? 'white' : '#374151',
                  borderBottom: '1px solid #e5e7eb',
                }}>
                  {fmtDay(date)}
                </div>
                <div style={{ padding: '0.375rem' }}>
                  {dayShifts.length === 0 ? (
                    <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: '#d1d5db', padding: '1rem 0' }}>No shifts</p>
                  ) : dayShifts.map((shift: any) => {
                    const st = SHIFT_TYPES[shift.shiftType] || SHIFT_TYPES.MORNING;
                    const Icon = st.icon;
                    const statusStyle = STATUS_COLORS[shift.status] || STATUS_COLORS.SCHEDULED;
                    return (
                      <div key={shift.id} style={{
                        padding: '0.375rem', borderRadius: 6, marginBottom: '0.25rem',
                        background: st.bg, borderLeft: `3px solid ${st.color}`, fontSize: '0.6875rem',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                          <Icon style={{ width: 10, height: 10, color: st.color }} />
                          <span style={{ fontWeight: 600, color: st.color }}>{st.label}</span>
                        </div>
                        <div style={{ fontWeight: 500, color: '#374151' }}>
                          {shift.staffProfile?.employeeId || shift.staffProfile?.designation || 'Staff'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                          <span style={{ padding: '1px 4px', borderRadius: 4, fontSize: '0.5625rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                            {shift.status}
                          </span>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {shift.status === 'SCHEDULED' && (
                              <button onClick={() => checkInMut.mutate(shift.id)} title="Check In"
                                style={{ width: 18, height: 18, borderRadius: 4, background: '#16a34a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LogIn style={{ width: 10, height: 10, color: 'white' }} />
                              </button>
                            )}
                            {shift.status === 'CHECKED_IN' && (
                              <button onClick={() => checkOutMut.mutate(shift.id)} title="Check Out"
                                style={{ width: 18, height: 18, borderRadius: 4, background: '#2563eb', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LogOut style={{ width: 10, height: 10, color: 'white' }} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e5e7eb', padding: '0.875rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '0.6875rem', color: '#6b7280', margin: '0 0 2px' }}>{label}</p>
          <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{value}</p>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
      </div>
    </div>
  );
}
