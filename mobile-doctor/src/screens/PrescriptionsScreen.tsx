import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService } from '../services/doctor.service';

interface Prescription {
  id: string;
  status: string;
  createdAt: string;
  patient?: { firstName: string; lastName: string; mrn: string };
  items?: Array<{ drugName: string; dosage: string; frequency: string; duration: string; quantity: number }>;
}

const statusColors: Record<string, string> = { PENDING: '#ca8a04', DISPENSED: '#16a34a', PARTIALLY_DISPENSED: '#2563eb', CANCELLED: '#dc2626' };

export default function PrescriptionsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Prescription[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try { setItems(await doctorService.getPrescriptions(user.tenantId, user.id)); } catch { /* */ }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <View style={s.container}>
      <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#059669" />}
        ListEmptyComponent={<Text style={s.empty}>No prescriptions found</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.patient?.firstName} {item.patient?.lastName}</Text>
                <Text style={s.sub}>MRN: {item.patient?.mrn} | {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <View style={[s.badge, { backgroundColor: (statusColors[item.status] || '#6b7280') + '20' }]}>
                <Text style={[s.badgeText, { color: statusColors[item.status] || '#6b7280' }]}>{item.status}</Text>
              </View>
            </View>
            {item.items?.map((d, i) => (
              <View key={i} style={s.drugRow}>
                <Ionicons name="medical" size={14} color="#059669" />
                <Text style={s.drugName}>{d.drugName}</Text>
                <Text style={s.drugDetail}>{d.dosage} | {d.frequency} x {d.duration}</Text>
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  drugRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  drugName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  drugDetail: { fontSize: 12, color: '#6b7280' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
