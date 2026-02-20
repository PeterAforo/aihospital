import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Syringe, Plus, Play, Square } from 'lucide-react';

const TYPES = ['GENERAL','REGIONAL','SPINAL','EPIDURAL','LOCAL','SEDATION','COMBINED'];
const ASA = ['I','II','III','IV','V','VI'];
const MONITORS = ['ECG','SPO2','NIBP','ETCO2','IBP','TEMP','BIS','NMT'];
const sc: Record<string,{bg:string;text:string}> = { PLANNED:{bg:'#eff6ff',text:'#2563eb'}, IN_PROGRESS:{bg:'#fef9c3',text:'#ca8a04'}, COMPLETED:{bg:'#f0fdf4',text:'#16a34a'}, CANCELLED:{bg:'#fef2f2',text:'#dc2626'} };
const inp = { padding:'0.5rem', border:'1px solid #d1d5db', borderRadius:6, fontSize:'0.8125rem', width:'100%' } as const;
const lbl = { fontSize:'0.75rem', fontWeight:600 as const, color:'#374151', display:'block' as const, marginBottom:2 };

export default function AnesthesiaRecordPage() {
  const [showForm, setShowForm] = useState(false);
  const [selId, setSelId] = useState('');
  const [filter, setFilter] = useState('');
  const qc = useQueryClient();
  const tid = localStorage.getItem('tenantId') || '';

  const { data } = useQuery({ queryKey: ['anes', filter], queryFn: () => api.get('/anesthesia', { params: { tenantId: tid, status: filter || undefined } }).then(r => r.data) });
  const records = data?.records || [];
  const { data: det } = useQuery({ queryKey: ['anes-d', selId], queryFn: () => api.get(`/anesthesia/${selId}`).then(r => r.data?.data), enabled: !!selId });

  const [f, setF] = useState({ surgeryId:'', patientId:'', anesthetistId:'', anesthesiaType:'GENERAL', asaClass:'', mallampatiScore:'', technique:'', airwayDevice:'', inductionAgent:'', inductionDose:'', muscleRelaxant:'', maintenanceAgent:'', opioidUsed:'', allergies:'', npoStatus:'', monitoringUsed:[] as string[], anesthesiaPlan:'', preOpNotes:'' });
  const [vf, setVf] = useState({ hr:'', sbp:'', dbp:'', spo2:'', etco2:'', temp:'', rr:'' });

  const createM = useMutation({ mutationFn: (d:any) => api.post('/anesthesia', { ...d, tenantId: tid }).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['anes'] }); setShowForm(false); } });
  const startM = useMutation({ mutationFn: (id:string) => api.patch(`/anesthesia/${id}/start`).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['anes'] }) });
  const completeM = useMutation({ mutationFn: () => api.patch(`/anesthesia/${selId}/complete`, {}).then(r => r.data), onSuccess: () => qc.invalidateQueries({ queryKey: ['anes'] }) });
  const vitalM = useMutation({ mutationFn: (d:any) => api.post(`/anesthesia/${selId}/vitals`, d).then(r => r.data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['anes-d', selId] }); setVf({ hr:'', sbp:'', dbp:'', spo2:'', etco2:'', temp:'', rr:'' }); } });

  const togMon = (m:string) => setF(p => ({ ...p, monitoringUsed: p.monitoringUsed.includes(m) ? p.monitoringUsed.filter(x=>x!==m) : [...p.monitoringUsed, m] }));

  return (
    <div style={{ padding:'1.5rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#8b5cf6,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center' }}><Syringe style={{ width:24, height:24, color:'white' }} /></div>
          <div><h1 style={{ fontSize:'1.5rem', fontWeight:700, margin:0 }}>Anesthesia Records</h1><p style={{ color:'#6b7280', margin:0, fontSize:'0.875rem' }}>Pre-op, intraoperative monitoring, PACU</p></div>
        </div>
        <div style={{ display:'flex', gap:'0.5rem' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inp, width:'auto' }}><option value="">All</option><option value="PLANNED">Planned</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select>
          <button onClick={() => setShowForm(!showForm)} style={{ display:'flex', alignItems:'center', gap:4, padding:'0.5rem 1rem', background:'#7c3aed', color:'white', border:'none', borderRadius:8, fontSize:'0.8125rem', fontWeight:600, cursor:'pointer' }}><Plus style={{ width:16, height:16 }} /> New</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background:'#f5f3ff', borderRadius:12, padding:'1.25rem', marginBottom:'1.5rem', border:'1px solid #ddd6fe' }}>
          <h3 style={{ fontSize:'1rem', fontWeight:600, margin:'0 0 1rem' }}>New Anesthesia Record</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.75rem' }}>
            <div><label style={lbl}>Surgery ID *</label><input value={f.surgeryId} onChange={e=>setF(p=>({...p,surgeryId:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Patient ID *</label><input value={f.patientId} onChange={e=>setF(p=>({...p,patientId:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Anesthetist ID *</label><input value={f.anesthetistId} onChange={e=>setF(p=>({...p,anesthetistId:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Type *</label><select value={f.anesthesiaType} onChange={e=>setF(p=>({...p,anesthesiaType:e.target.value}))} style={inp}>{TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={lbl}>ASA</label><select value={f.asaClass} onChange={e=>setF(p=>({...p,asaClass:e.target.value}))} style={inp}><option value="">-</option>{ASA.map(c=><option key={c}>ASA {c}</option>)}</select></div>
            <div><label style={lbl}>Induction</label><input value={f.inductionAgent} onChange={e=>setF(p=>({...p,inductionAgent:e.target.value}))} style={inp} placeholder="Propofol" /></div>
            <div><label style={lbl}>Dose</label><input value={f.inductionDose} onChange={e=>setF(p=>({...p,inductionDose:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Maintenance</label><input value={f.maintenanceAgent} onChange={e=>setF(p=>({...p,maintenanceAgent:e.target.value}))} style={inp} placeholder="Sevoflurane" /></div>
            <div><label style={lbl}>Relaxant</label><input value={f.muscleRelaxant} onChange={e=>setF(p=>({...p,muscleRelaxant:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Opioid</label><input value={f.opioidUsed} onChange={e=>setF(p=>({...p,opioidUsed:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Allergies</label><input value={f.allergies} onChange={e=>setF(p=>({...p,allergies:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>NPO</label><input value={f.npoStatus} onChange={e=>setF(p=>({...p,npoStatus:e.target.value}))} style={inp} /></div>
          </div>
          <div style={{ marginTop:'0.75rem' }}><label style={lbl}>Monitoring</label>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{MONITORS.map(m=><button key={m} onClick={()=>togMon(m)} style={{ padding:'4px 10px', borderRadius:16, fontSize:'0.75rem', fontWeight:600, cursor:'pointer', background:f.monitoringUsed.includes(m)?'#7c3aed':'#f3f4f6', color:f.monitoringUsed.includes(m)?'white':'#6b7280', border:'1px solid '+(f.monitoringUsed.includes(m)?'#7c3aed':'#d1d5db') }}>{m}</button>)}</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem', marginTop:'0.75rem' }}>
            <div><label style={lbl}>Plan</label><textarea value={f.anesthesiaPlan} onChange={e=>setF(p=>({...p,anesthesiaPlan:e.target.value}))} style={{ ...inp, minHeight:50 }} /></div>
            <div><label style={lbl}>Pre-Op Notes</label><textarea value={f.preOpNotes} onChange={e=>setF(p=>({...p,preOpNotes:e.target.value}))} style={{ ...inp, minHeight:50 }} /></div>
          </div>
          <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.75rem' }}>
            <button onClick={()=>createM.mutate(f)} disabled={createM.isPending||!f.surgeryId||!f.patientId||!f.anesthetistId} style={{ padding:'0.5rem 1rem', background:'#7c3aed', color:'white', border:'none', borderRadius:8, fontSize:'0.8125rem', fontWeight:600, cursor:'pointer' }}>{createM.isPending?'Creating...':'Create'}</button>
            <button onClick={()=>setShowForm(false)} style={{ padding:'0.5rem 1rem', background:'#f3f4f6', border:'1px solid #d1d5db', borderRadius:8, fontSize:'0.8125rem', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns: selId ? '1fr 1fr' : '1fr', gap:'1rem' }}>
        <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:'1rem' }}>
          <h3 style={{ fontSize:'0.875rem', fontWeight:600, margin:'0 0 0.75rem' }}>Records ({records.length})</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', maxHeight:600, overflowY:'auto' }}>
            {records.map((r:any) => { const s = sc[r.status]||sc.PLANNED; return (
              <button key={r.id} onClick={()=>setSelId(r.id)} style={{ display:'block', width:'100%', textAlign:'left', padding:'0.75rem', borderRadius:8, border:selId===r.id?'2px solid #7c3aed':'1px solid #e5e7eb', background:selId===r.id?'#f5f3ff':'white', cursor:'pointer' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontWeight:600, fontSize:'0.8125rem' }}>{r.patient?.firstName} {r.patient?.lastName}</span><span style={{ background:s.bg, color:s.text, padding:'2px 8px', borderRadius:12, fontSize:'0.6875rem', fontWeight:600 }}>{r.status}</span></div>
                <div style={{ fontSize:'0.75rem', color:'#6b7280' }}>MRN: {r.patient?.mrn} | {r.anesthesiaType} | ASA {r.asaClass||'N/A'}</div>
              </button>
            ); })}
            {!records.length && <p style={{ textAlign:'center', color:'#9ca3af', padding:'2rem' }}>No records</p>}
          </div>
        </div>

        {selId && det && (
          <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', padding:'1rem', maxHeight:700, overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'1rem' }}>
              <h3 style={{ fontSize:'1rem', fontWeight:600, margin:0 }}>{det.patient?.firstName} {det.patient?.lastName}</h3>
              <div style={{ display:'flex', gap:'0.5rem' }}>
                {det.status==='PLANNED' && <button onClick={()=>startM.mutate(selId)} style={{ display:'flex', alignItems:'center', gap:4, padding:'0.375rem 0.75rem', background:'#f59e0b', color:'white', border:'none', borderRadius:8, fontSize:'0.75rem', fontWeight:600, cursor:'pointer' }}><Play style={{ width:12, height:12 }} /> Start</button>}
                {det.status==='IN_PROGRESS' && <button onClick={()=>completeM.mutate()} style={{ display:'flex', alignItems:'center', gap:4, padding:'0.375rem 0.75rem', background:'#16a34a', color:'white', border:'none', borderRadius:8, fontSize:'0.75rem', fontWeight:600, cursor:'pointer' }}><Square style={{ width:12, height:12 }} /> Complete</button>}
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.5rem', marginBottom:'1rem' }}>
              <div style={{ background:'#f5f3ff', borderRadius:8, padding:'0.5rem', textAlign:'center' }}><div style={{ fontSize:'0.6875rem', color:'#6b7280' }}>Type</div><div style={{ fontSize:'0.875rem', fontWeight:600, color:'#7c3aed' }}>{det.anesthesiaType}</div></div>
              <div style={{ background:'#eff6ff', borderRadius:8, padding:'0.5rem', textAlign:'center' }}><div style={{ fontSize:'0.6875rem', color:'#6b7280' }}>ASA</div><div style={{ fontSize:'0.875rem', fontWeight:600, color:'#2563eb' }}>{det.asaClass||'N/A'}</div></div>
              <div style={{ background:'#fef9c3', borderRadius:8, padding:'0.5rem', textAlign:'center' }}><div style={{ fontSize:'0.6875rem', color:'#6b7280' }}>Mallampati</div><div style={{ fontSize:'0.875rem', fontWeight:600, color:'#ca8a04' }}>{det.mallampatiScore||'N/A'}</div></div>
            </div>
            <div style={{ background:'#f9fafb', borderRadius:8, padding:'0.75rem', marginBottom:'0.75rem', border:'1px solid #e5e7eb' }}>
              <h4 style={{ fontSize:'0.75rem', fontWeight:600, margin:'0 0 0.5rem', textTransform:'uppercase' }}>Medications</h4>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, fontSize:'0.75rem', color:'#6b7280' }}>
                {det.inductionAgent && <div><b>Induction:</b> {det.inductionAgent} {det.inductionDose}</div>}
                {det.muscleRelaxant && <div><b>Relaxant:</b> {det.muscleRelaxant}</div>}
                {det.maintenanceAgent && <div><b>Maintenance:</b> {det.maintenanceAgent}</div>}
                {det.opioidUsed && <div><b>Opioid:</b> {det.opioidUsed} {det.opioidDose}</div>}
                {det.airwayDevice && <div><b>Airway:</b> {det.airwayDevice}</div>}
                {det.ivFluids && <div><b>IV Fluids:</b> {det.ivFluids}</div>}
              </div>
            </div>
            {det.monitoringUsed?.length>0 && <div style={{ marginBottom:'0.75rem' }}><h4 style={{ fontSize:'0.75rem', fontWeight:600, margin:'0 0 4px', textTransform:'uppercase' }}>Monitoring</h4><div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>{det.monitoringUsed.map((m:string)=><span key={m} style={{ background:'#ddd6fe', color:'#7c3aed', padding:'2px 8px', borderRadius:12, fontSize:'0.6875rem', fontWeight:600 }}>{m}</span>)}</div></div>}

            {det.status==='IN_PROGRESS' && (
              <div style={{ background:'#fef9c3', borderRadius:8, padding:'0.75rem', marginBottom:'0.75rem', border:'1px solid #fde68a' }}>
                <h4 style={{ fontSize:'0.75rem', fontWeight:600, margin:'0 0 0.5rem' }}>Record Vitals</h4>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.5rem' }}>
                  {(['hr','sbp','dbp','spo2','etco2','temp','rr'] as const).map(k=><div key={k}><label style={{ fontSize:'0.6875rem', color:'#6b7280' }}>{k.toUpperCase()}</label><input type="number" value={vf[k]} onChange={e=>setVf(p=>({...p,[k]:e.target.value}))} style={{ ...inp, padding:'0.375rem' }} /></div>)}
                  <div style={{ display:'flex', alignItems:'end' }}><button onClick={()=>vitalM.mutate({ time:new Date().toISOString(), hr:+vf.hr||undefined, sbp:+vf.sbp||undefined, dbp:+vf.dbp||undefined, spo2:+vf.spo2||undefined, etco2:+vf.etco2||undefined, temp:+vf.temp||undefined, rr:+vf.rr||undefined })} style={{ padding:'0.375rem 0.75rem', background:'#ca8a04', color:'white', border:'none', borderRadius:6, fontSize:'0.75rem', fontWeight:600, cursor:'pointer' }}>Add</button></div>
                </div>
              </div>
            )}

            {det.vitalSigns && (det.vitalSigns as any[]).length>0 && (
              <div style={{ marginBottom:'0.75rem' }}>
                <h4 style={{ fontSize:'0.75rem', fontWeight:600, margin:'0 0 4px', textTransform:'uppercase' }}>Vital Signs Log</h4>
                <table style={{ width:'100%', fontSize:'0.6875rem', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'#f3f4f6' }}>{['Time','HR','SBP','DBP','SpO2','EtCO2','Temp','RR'].map(h=><th key={h} style={{ padding:'4px 6px', textAlign:'left', borderBottom:'1px solid #e5e7eb' }}>{h}</th>)}</tr></thead>
                  <tbody>{(det.vitalSigns as any[]).map((v:any,i:number)=><tr key={i} style={{ borderBottom:'1px solid #f3f4f6' }}><td style={{ padding:'4px 6px' }}>{v.time ? new Date(v.time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}) : '-'}</td><td style={{ padding:'4px 6px' }}>{v.hr||'-'}</td><td style={{ padding:'4px 6px' }}>{v.sbp||'-'}</td><td style={{ padding:'4px 6px' }}>{v.dbp||'-'}</td><td style={{ padding:'4px 6px' }}>{v.spo2||'-'}</td><td style={{ padding:'4px 6px' }}>{v.etco2||'-'}</td><td style={{ padding:'4px 6px' }}>{v.temp||'-'}</td><td style={{ padding:'4px 6px' }}>{v.rr||'-'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            {det.anesthesiaPlan && <div style={{ marginBottom:'0.5rem' }}><h4 style={{ fontSize:'0.75rem', fontWeight:600, margin:'0 0 2px' }}>Plan</h4><p style={{ fontSize:'0.75rem', color:'#6b7280', margin:0 }}>{det.anesthesiaPlan}</p></div>}
            {det.preOpNotes && <div><h4 style={{ fontSize:'0.75rem', fontWeight:600, margin:'0 0 2px' }}>Pre-Op Notes</h4><p style={{ fontSize:'0.75rem', color:'#6b7280', margin:0 }}>{det.preOpNotes}</p></div>}
          </div>
        )}
      </div>
    </div>
  );
}
