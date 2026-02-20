import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService, InpatientRecord } from '../services/doctor.service';

export default function InpatientsScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState<InpatientRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try { setRecords(await doctorService.getInpatients(user.tenantId)); } catch { /* */ }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <View style={s.container}>
      <FlatList data={records} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#059669" />}
        ListEmptyComponent={<Text style={s.empty}>No inpatients found</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.patient?.firstName} {item.patient?.lastName}</Text>
                <Text style={s.sub}>MRN: {item.patient?.mrn}</Text>
              </View>
              <View style={s.wardBadge}><Text style={s.wardText}>{item.ward || 'N/A'}</Text></View>
            </View>
            <View style={s.details}>
              {item.bed && <View style={s.detailRow}><Ionicons name="bed-outline" size={14} color="#6b7280" /><Text style={s.detailText}>Bed: {item.bed}</Text></View>}
              {item.diagnosis && <View style={s.detailRow}><Ionicons name="medkit-outline" size={14} color="#6b7280" /><Text style={s.detailText}>{item.diagnosis}</Text></View>}
              <View style={s.detailRow}><Ionicons name="calendar-outline" size={14} color="#6b7280" /><Text style={s.detailText}>Admitted: {new Date(item.admissionDate).toLocaleDateString()}</Text></View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  wardBadge: { backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  wardText: { fontSize: 12, fontWeight: '700', color: '#7c3aed' },
  details: { marginTop: 10, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#6b7280' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
