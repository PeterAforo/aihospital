import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService, Encounter } from '../services/doctor.service';

const statusColors: Record<string, string> = { OPEN: '#2563eb', IN_PROGRESS: '#ca8a04', COMPLETED: '#16a34a', CANCELLED: '#dc2626' };

export default function EncountersScreen() {
  const { user } = useAuth();
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try { setEncounters(await doctorService.getEncounters(user.tenantId, user.id)); } catch { /* */ }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <View style={s.container}>
      <FlatList data={encounters} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#059669" />}
        ListEmptyComponent={<Text style={s.empty}>No encounters found</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.patient?.firstName} {item.patient?.lastName}</Text>
                <Text style={s.sub}>MRN: {item.patient?.mrn} | {item.encounterType}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: (statusColors[item.status] || '#6b7280') + '20' }]}>
                <Text style={[s.badgeText, { color: statusColors[item.status] || '#6b7280' }]}>{item.status}</Text>
              </View>
            </View>
            <View style={s.detailRow}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text style={s.detailText}>{new Date(item.encounterDate).toLocaleDateString()}</Text>
            </View>
            {item.chiefComplaint && <View style={s.detailRow}><Ionicons name="chatbubble-outline" size={14} color="#6b7280" /><Text style={s.detailText}>{item.chiefComplaint}</Text></View>}
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
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  detailText: { fontSize: 13, color: '#6b7280' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
