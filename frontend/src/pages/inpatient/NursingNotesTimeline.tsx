import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  ClipboardList, ArrowLeft, Clock, User, Plus, Send,
  FileText, AlertTriangle, Stethoscope,
} from 'lucide-react';

const NOTE_TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  ASSESSMENT: { bg: '#eff6ff', color: '#2563eb', label: 'Assessment' },
  INTERVENTION: { bg: '#f0fdf4', color: '#16a34a', label: 'Intervention' },
  OBSERVATION: { bg: '#fefce8', color: '#ca8a04', label: 'Observation' },
  MEDICATION: { bg: '#faf5ff', color: '#7c3aed', label: 'Medication' },
  VITAL_SIGNS: { bg: '#fff7ed', color: '#ea580c', label: 'Vital Signs' },
  HANDOFF: { bg: '#fef2f2', color: '#dc2626', label: 'Handoff' },
  GENERAL: { bg: '#f9fafb', color: '#6b7280', label: 'General' },
};

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NursingNotesTimeline() {
  const { admissionId } = useParams<{ admissionId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState('GENERAL');
  const [noteContent, setNoteContent] = useState('');
  const [priority, setPriority] = useState('NORMAL');

  const { data, isLoading } = useQuery({
    queryKey: ['nursing-notes', admissionId],
    queryFn: () => api.get(`/inpatient/admissions/${admissionId}/nursing-notes?limit=50`).then(r => r.data),
    enabled: !!admissionId,
  });

  const addNoteMut = useMutation({
    mutationFn: (body: any) => api.post(`/inpatient/admissions/${admissionId}/nursing-notes`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nursing-notes', admissionId] });
      setShowForm(false);
      setNoteContent('');
      setNoteType('GENERAL');
      setPriority('NORMAL');
    },
  });

  const notes = (data as any)?.data?.notes || (data as any)?.data || [];

  // Group notes by date
  const grouped: Record<string, any[]> = {};
  for (const note of (Array.isArray(notes) ? notes : [])) {
    const dateKey = formatDate(note.createdAt || note.noteDate || new Date().toISOString());
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(note);
  }

  const handleSubmit = () => {
    if (!noteContent.trim()) return;
    addNoteMut.mutate({
      noteType,
      content: noteContent,
      priority,
    });
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <ArrowLeft style={{ width: 20, height: 20, color: '#6b7280' }} />
          </button>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #ec4899, #be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList style={{ width: 24, height: 24, color: 'white' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Nursing Notes</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
              {(Array.isArray(notes) ? notes : []).length} notes recorded
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '0.5rem 1rem', background: showForm ? '#f3f4f6' : '#ec4899', color: showForm ? '#374151' : 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus style={{ width: 14, height: 14 }} /> {showForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {/* Add Note Form */}
      {showForm && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.75rem' }}>New Nursing Note</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Note Type</label>
              <select value={noteType} onChange={e => setNoteType(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }}>
                {Object.entries(NOTE_TYPE_COLORS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', boxSizing: 'border-box' }}>
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: '#6b7280' }}>Note Content</label>
            <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)}
              rows={4} placeholder="Enter nursing note..."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <button onClick={handleSubmit} disabled={addNoteMut.isPending || !noteContent.trim()}
            style={{ padding: '0.5rem 1.25rem', background: '#ec4899', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: addNoteMut.isPending ? 0.6 : 1 }}>
            <Send style={{ width: 14, height: 14 }} /> {addNoteMut.isPending ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      )}

      {/* Timeline */}
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>Loading nursing notes...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <FileText style={{ width: 48, height: 48, color: '#d1d5db', margin: '0 auto 1rem' }} />
          <p>No nursing notes recorded yet</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateStr, dayNotes]) => (
          <div key={dateStr} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>{dateStr}</span>
              <div style={{ height: 1, flex: 1, background: '#e5e7eb' }} />
            </div>

            <div style={{ position: 'relative', paddingLeft: 28 }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: '#e5e7eb' }} />

              {dayNotes.map((note: any) => {
                const typeInfo = NOTE_TYPE_COLORS[note.noteType] || NOTE_TYPE_COLORS.GENERAL;
                const isUrgent = note.priority === 'URGENT' || note.priority === 'HIGH';
                return (
                  <div key={note.id} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', position: 'relative' }}>
                    {/* Dot */}
                    <div style={{
                      position: 'absolute', left: -24, width: 18, height: 18, borderRadius: '50%',
                      background: typeInfo.bg, border: `2px solid ${typeInfo.color}`, zIndex: 1,
                    }} />

                    {/* Card */}
                    <div style={{
                      flex: 1, background: 'white', borderRadius: 10, border: '1px solid #e5e7eb',
                      padding: '0.875rem', borderLeft: isUrgent ? `4px solid #dc2626` : `4px solid ${typeInfo.color}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 600, background: typeInfo.bg, color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                          {isUrgent && (
                            <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.6875rem', fontWeight: 700, background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 2 }}>
                              <AlertTriangle style={{ width: 10, height: 10 }} /> {note.priority}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6875rem', color: '#9ca3af' }}>
                          <Clock style={{ width: 11, height: 11 }} />
                          {formatTime(note.createdAt || note.noteDate)}
                        </div>
                      </div>

                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', lineHeight: 1.5, color: '#374151', whiteSpace: 'pre-wrap' }}>
                        {note.content || note.notes || note.note || '-'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.6875rem', color: '#9ca3af' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <User style={{ width: 11, height: 11 }} />
                          {note.nurse?.firstName ? `${note.nurse.firstName} ${note.nurse.lastName}` : note.author?.firstName ? `${note.author.firstName} ${note.author.lastName}` : 'Nurse'}
                        </div>
                        {note.department?.name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Stethoscope style={{ width: 11, height: 11 }} />
                            {note.department.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
