import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService, LabOrder } from '../services/doctor.service';

export default function LabOrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try { setOrders(await doctorService.getLabOrders(user.tenantId, user.id)); } catch { /* */ }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [user]);

  return (
    <View style={s.container}>
      <FlatList data={orders} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#059669" />}
        ListEmptyComponent={<Text style={s.empty}>No lab orders found</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.name}>{item.patient?.firstName} {item.patient?.lastName}</Text>
              <View style={[s.badge, { backgroundColor: item.priority === 'URGENT' ? '#fef2f2' : '#eff6ff' }]}>
                <Text style={[s.badgeText, { color: item.priority === 'URGENT' ? '#dc2626' : '#2563eb' }]}>{item.priority}</Text>
              </View>
            </View>
            <Text style={s.sub}>MRN: {item.patient?.mrn} | {new Date(item.orderDate).toLocaleDateString()}</Text>
            {item.items?.map((t, i) => (
              <View key={t.id || i} style={s.testRow}>
                <Ionicons name={t.isCritical ? 'alert-circle' : t.isAbnormal ? 'warning' : 'checkmark-circle'} size={16} color={t.isCritical ? '#dc2626' : t.isAbnormal ? '#ca8a04' : '#16a34a'} />
                <Text style={s.testName}>{t.test?.name}</Text>
                <Text style={[s.testResult, t.isCritical && { color: '#dc2626', fontWeight: '700' }]}>{t.result || t.resultValue || t.status}</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  testName: { flex: 1, fontSize: 13, color: '#374151' },
  testResult: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
