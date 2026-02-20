import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { aiService } from '../../../services/ai.service';
import { Stethoscope, Search } from 'lucide-react';

export default function ICD10Tab() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['icd10', search],
    queryFn: () => aiService.searchICD10(search, 15),
    enabled: search.length >= 2,
  });

  const results = (data as any)?.data?.results || [];

  const handleSearch = () => {
    if (query.length >= 2) setSearch(query);
  };

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginTop: 0, marginBottom: '1rem' }}>
          <Stethoscope style={{ width: 16, height: 16, display: 'inline', marginRight: 6 }} /> ICD-10 Coding Assistant
        </h3>
        <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
          Search by diagnosis name, symptom, or ICD-10 code. Optimized for conditions common in Ghana.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. malaria, hypertension, J06, chest pain..."
            style={{ flex: 1, padding: '0.625rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 8, fontSize: '0.875rem' }} />
          <button onClick={handleSearch} disabled={query.length < 2}
            style={{ padding: '0.625rem 1.25rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search style={{ width: 16, height: 16 }} /> Search
          </button>
        </div>

        {isFetching && <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Searching...</p>}

        {results.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, color: '#374151' }}>Code</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, color: '#374151' }}>Description</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, color: '#374151' }}>Keywords</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onClick={() => navigator.clipboard.writeText(r.code)}>
                  <td style={{ padding: '0.5rem' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, background: '#eff6ff', color: '#2563eb', fontWeight: 600, fontFamily: 'monospace' }}>{r.code}</span>
                  </td>
                  <td style={{ padding: '0.5rem', color: '#374151' }}>{r.description}</td>
                  <td style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {r.keywords?.slice(0, 3).map((kw: string, j: number) => (
                        <span key={j} style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.6875rem', background: '#f3f4f6', color: '#6b7280' }}>{kw}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {search.length >= 2 && !isFetching && results.length === 0 && (
          <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No matching ICD-10 codes found</p>
        )}

        <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '1rem', marginBottom: 0 }}>
          Click any row to copy the ICD-10 code. Database includes 48+ common Ghana conditions.
        </p>
      </div>
    </div>
  );
}
