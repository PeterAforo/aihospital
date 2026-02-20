import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maternityApiService, Pregnancy, PostnatalVisit } from '../../services/maternity.service';
import { Baby, Heart, Calendar, Plus, User } from 'lucide-react';

export default function PostnatalCarePage() {
  const [tab, setTab] = useState<'pnc'|'newborns'>('pnc');
  const [selectedId, setSelectedId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const qc = useQueryClient();

  const { data: pregData } = useQuery({
    queryKey: ['maternity-delivered'],
    queryFn: () => maternityApiService.getPregnancies({ status: 'DELIVERED', limit: 100 }),
  });
  const pregnancies = pregData?.pregnancies || [];

  const { data: detail } = useQuery({
    queryKey: ['pregnancy-detail', selectedId],
    queryFn: () => maternityApiService.getPregnancyById(selectedId),
    enabled: !!selectedId,
  });

  const pncVisits: PostnatalVisit[] = (detail as any)?.postnatalVisits || [];
  const newborns: any[] = (detail as any)?.deliveryRecord?.newborns || [];

  const [form, setForm] = useState({ daysPostpartum: '', motherCondition: 'GOOD', breastfeeding: 'EXCLUSIVE', emotionalState: 'STABLE', babyWeight: '', babyCondition: 'HEALTHY', findings: '', plan: '', notes: '' });

  const [nbForm, setNbForm] = useState({ gender: 'MALE', birthWeight: '', birthLength: '', headCircumference: '', apgarScore1Min: '', apgarScore5Min: '', status: 'ALIVE', vitaminKGiven: false, bcgGiven: false, opv0Given: false, breastfeedingInitiated: false, notes: '' });

  const pncMut = useMutation({
    mutationFn: (d: any) => maternityApiService.createPostnatalVisit(selectedId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pregnancy-detail', selectedId] }); setShowForm(false); },
  });

  const nbMut = useMutation({
    mutationFn: (d: any) => maternityApiService.createNewbornRecord((detail as any)?.deliveryRecord?.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pregnancy-detail', selectedId] }); setShowForm(false); },
  });

  const inp = { padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 6, fontSize: '0.8125rem', width: '100%' } as const;
  const lbl = { fontSize: '0.75rem', fontWeight: 600 as const, color: '#374151', display: 'block', marginBottom: 2 };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #ec4899, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Baby style={{ width: 24, height: 24, color: 'white' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Postnatal Care & Newborn</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>PNC tracking, newborn records, immunizations</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1rem' }}>
        {/* Patient list */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1rem', maxHeight: 600, overflowY: 'auto' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: '#6b7280', margin: '0 0 0.5rem' }}>Delivered Patients</h3>
          {pregnancies.map((p: Pregnancy) => (
            <button key={p.id} onClick={() => setSelectedId(p.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.5rem', borderRadius: 8, border: 'none', cursor: 'pointer', background: selectedId === p.id ? '#fdf2f8' : 'transparent', marginBottom: 2 }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: selectedId === p.id ? '#db2777' : '#374151' }}>{p.patient?.firstName} {p.patient?.lastName}</div>
              <div style={{ fontSize: '0.6875rem', color: '#9ca3af' }}>MRN: {p.patient?.mrn} | G{p.gravida}P{p.para}</div>
            </button>
          ))}
          {!pregnancies.length && <p style={{ fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>No delivered patients</p>}
        </div>

        {/* Content */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
          {!selectedId ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#9ca3af' }}><User style={{ width: 48, height: 48, margin: '0 auto 1rem', color: '#d1d5db' }} /><p>Select a patient</p></div>
          ) : (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e5e7eb', marginBottom: '1rem' }}>
                {[{ id: 'pnc' as const, label: 'PNC Visits', icon: Heart }, { id: 'newborns' as const, label: 'Newborns', icon: Baby }].map(t => (
                  <button key={t.id} onClick={() => { setTab(t.id); setShowForm(false); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem', border: 'none', background: 'none', cursor: 'pointer', borderBottom: tab === t.id ? '2px solid #ec4899' : '2px solid transparent', color: tab === t.id ? '#ec4899' : '#6b7280', fontWeight: tab === t.id ? 600 : 400, fontSize: '0.875rem', marginBottom: -2 }}>
                    <t.icon style={{ width: 16, height: 16 }} /> {t.label}
                  </button>
                ))}
              </div>

              {/* PNC Tab */}
              {tab === 'pnc' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Postnatal Visits ({pncVisits.length})</h3>
                    <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.375rem 0.75rem', background: '#ec4899', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}><Plus style={{ width: 14, height: 14 }} /> Add Visit</button>
                  </div>
                  {showForm && (
                    <div style={{ background: '#fdf2f8', borderRadius: 8, padding: '1rem', marginBottom: '1rem', border: '1px solid #fbcfe8' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div><label style={lbl}>Days Postpartum</label><input type="number" value={form.daysPostpartum} onChange={e => setForm(f => ({ ...f, daysPostpartum: e.target.value }))} style={inp} /></div>
                        <div><label style={lbl}>Mother Condition</label><select value={form.motherCondition} onChange={e => setForm(f => ({ ...f, motherCondition: e.target.value }))} style={inp}><option value="GOOD">Good</option><option value="FAIR">Fair</option><option value="POOR">Poor</option></select></div>
                        <div><label style={lbl}>Breastfeeding</label><select value={form.breastfeeding} onChange={e => setForm(f => ({ ...f, breastfeeding: e.target.value }))} style={inp}><option value="EXCLUSIVE">Exclusive</option><option value="PARTIAL">Partial</option><option value="NONE">None</option></select></div>
                        <div><label style={lbl}>Emotional State</label><select value={form.emotionalState} onChange={e => setForm(f => ({ ...f, emotionalState: e.target.value }))} style={inp}><option value="STABLE">Stable</option><option value="ANXIOUS">Anxious</option><option value="DEPRESSED">Depressed</option></select></div>
                        <div><label style={lbl}>Baby Weight (kg)</label><input type="number" step="0.01" value={form.babyWeight} onChange={e => setForm(f => ({ ...f, babyWeight: e.target.value }))} style={inp} /></div>
                        <div><label style={lbl}>Baby Condition</label><select value={form.babyCondition} onChange={e => setForm(f => ({ ...f, babyCondition: e.target.value }))} style={inp}><option value="HEALTHY">Healthy</option><option value="JAUNDICE">Jaundice</option><option value="INFECTION">Infection</option></select></div>
                        <div style={{ gridColumn: 'span 3' }}><label style={lbl}>Findings</label><textarea value={form.findings} onChange={e => setForm(f => ({ ...f, findings: e.target.value }))} style={{ ...inp, minHeight: 50 }} /></div>
                        <div style={{ gridColumn: 'span 3' }}><label style={lbl}>Plan</label><textarea value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} style={{ ...inp, minHeight: 50 }} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button onClick={() => pncMut.mutate({ ...form, daysPostpartum: form.daysPostpartum ? Number(form.daysPostpartum) : undefined, babyWeight: form.babyWeight ? Number(form.babyWeight) : undefined })} disabled={pncMut.isPending} style={{ padding: '0.5rem 1rem', background: '#ec4899', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>{pncMut.isPending ? 'Saving...' : 'Save'}</button>
                        <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {pncVisits.map((v: PostnatalVisit) => (
                    <div key={v.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '0.75rem', border: '1px solid #e5e7eb', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: '#fdf2f8', color: '#db2777', padding: '2px 8px', borderRadius: 12, fontSize: '0.6875rem', fontWeight: 600 }}>Visit #{v.visitNumber}</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}><Calendar style={{ width: 12, height: 12, display: 'inline', marginRight: 2 }} />{new Date(v.visitDate).toLocaleDateString()}</span>
                          {v.daysPostpartum && <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Day {v.daysPostpartum}</span>}
                        </div>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: v.motherCondition === 'GOOD' ? '#16a34a' : '#ca8a04' }}>{v.motherCondition}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: '0.75rem', color: '#6b7280' }}>
                        {v.breastfeeding && <div>BF: {v.breastfeeding}</div>}
                        {v.emotionalState && <div>Mood: {v.emotionalState}</div>}
                        {v.babyWeight && <div>Baby: {v.babyWeight}kg</div>}
                        {v.babyCondition && <div>Baby: {v.babyCondition}</div>}
                      </div>
                      {v.notes && <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>{v.notes}</p>}
                    </div>
                  ))}
                  {!pncVisits.length && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem', fontSize: '0.875rem' }}>No postnatal visits recorded</p>}
                </>
              )}

              {/* Newborns Tab */}
              {tab === 'newborns' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Newborn Records ({newborns.length})</h3>
                    <button onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0.375rem 0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}><Plus style={{ width: 14, height: 14 }} /> Add Newborn</button>
                  </div>
                  {showForm && (
                    <div style={{ background: '#eff6ff', borderRadius: 8, padding: '1rem', marginBottom: '1rem', border: '1px solid #bfdbfe' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                        <div><label style={lbl}>Gender</label><select value={nbForm.gender} onChange={e => setNbForm(f => ({ ...f, gender: e.target.value }))} style={inp}><option value="MALE">Male</option><option value="FEMALE">Female</option></select></div>
                        <div><label style={lbl}>Birth Weight (g)</label><input type="number" value={nbForm.birthWeight} onChange={e => setNbForm(f => ({ ...f, birthWeight: e.target.value }))} style={inp} /></div>
                        <div><label style={lbl}>Birth Length (cm)</label><input type="number" value={nbForm.birthLength} onChange={e => setNbForm(f => ({ ...f, birthLength: e.target.value }))} style={inp} /></div>
                        <div><label style={lbl}>Head Circ. (cm)</label><input type="number" value={nbForm.headCircumference} onChange={e => setNbForm(f => ({ ...f, headCircumference: e.target.value }))} style={inp} /></div>
                        <div><label style={lbl}>APGAR 1 min</label><input type="number" max="10" value={nbForm.apgarScore1Min} onChange={e => setNbForm(f => ({ ...f, apgarScore1Min: e.target.value }))} style={inp} /></div>
                        <div><label style={lbl}>APGAR 5 min</label><input type="number" max="10" value={nbForm.apgarScore5Min} onChange={e => setNbForm(f => ({ ...f, apgarScore5Min: e.target.value }))} style={inp} /></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <label style={{ ...lbl, marginBottom: 4 }}>Immunizations</label>
                          <label style={{ fontSize: '0.75rem' }}><input type="checkbox" checked={nbForm.vitaminKGiven} onChange={e => setNbForm(f => ({ ...f, vitaminKGiven: e.target.checked }))} /> Vitamin K</label>
                          <label style={{ fontSize: '0.75rem' }}><input type="checkbox" checked={nbForm.bcgGiven} onChange={e => setNbForm(f => ({ ...f, bcgGiven: e.target.checked }))} /> BCG</label>
                          <label style={{ fontSize: '0.75rem' }}><input type="checkbox" checked={nbForm.opv0Given} onChange={e => setNbForm(f => ({ ...f, opv0Given: e.target.checked }))} /> OPV-0</label>
                        </div>
                        <div><label style={{ fontSize: '0.75rem' }}><input type="checkbox" checked={nbForm.breastfeedingInitiated} onChange={e => setNbForm(f => ({ ...f, breastfeedingInitiated: e.target.checked }))} /> Breastfeeding Initiated</label></div>
                        <div style={{ gridColumn: 'span 3' }}><label style={lbl}>Notes</label><textarea value={nbForm.notes} onChange={e => setNbForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inp, minHeight: 50 }} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button onClick={() => nbMut.mutate({ ...nbForm, birthWeight: nbForm.birthWeight ? Number(nbForm.birthWeight) : undefined, birthLength: nbForm.birthLength ? Number(nbForm.birthLength) : undefined, headCircumference: nbForm.headCircumference ? Number(nbForm.headCircumference) : undefined, apgarScore1Min: nbForm.apgarScore1Min ? Number(nbForm.apgarScore1Min) : undefined, apgarScore5Min: nbForm.apgarScore5Min ? Number(nbForm.apgarScore5Min) : undefined })} disabled={nbMut.isPending} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>{nbMut.isPending ? 'Saving...' : 'Save Newborn'}</button>
                        <button onClick={() => setShowForm(false)} style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.8125rem', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  )}
                  {newborns.map((nb: any) => (
                    <div key={nb.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '0.75rem', border: '1px solid #e5e7eb', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{nb.gender === 'MALE' ? '👦' : '👧'} {nb.gender}</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: nb.status === 'ALIVE' ? '#16a34a' : '#dc2626' }}>{nb.status}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: '0.75rem', color: '#6b7280' }}>
                        {nb.birthWeight && <div>Weight: {nb.birthWeight}g</div>}
                        {nb.birthLength && <div>Length: {nb.birthLength}cm</div>}
                        {nb.headCircumference && <div>HC: {nb.headCircumference}cm</div>}
                        {nb.apgarScore1Min != null && <div>APGAR: {nb.apgarScore1Min}/{nb.apgarScore5Min}</div>}
                        <div>Vit K: {nb.vitaminKGiven ? '✅' : '❌'}</div>
                        <div>BCG: {nb.bcgGiven ? '✅' : '❌'}</div>
                        <div>OPV-0: {nb.opv0Given ? '✅' : '❌'}</div>
                        <div>BF: {nb.breastfeedingInitiated ? '✅' : '❌'}</div>
                      </div>
                    </div>
                  ))}
                  {!newborns.length && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem', fontSize: '0.875rem' }}>No newborn records</p>}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
