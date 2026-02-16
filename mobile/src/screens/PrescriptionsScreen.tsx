import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { portalService, PortalPrescription } from '../services/portal.service';
import { format } from 'date-fns';

const statusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#fef3c7', text: '#92400e' },
  DISPENSED: { bg: '#dcfce7', text: '#15803d' },
  PARTIALLY_DISPENSED: { bg: '#e0f2fe', text: '#0369a1' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
};

export default function PrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState<PortalPrescription[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setPrescriptions(await portalService.getPrescriptions());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }: { item: PortalPrescription }) => {
    const sc = statusColors[item.status] || { bg: '#f3f4f6', text: '#374151' };
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.date}>{format(new Date(item.createdAt), 'MMM dd, yyyy')}</Text>
        </View>
        {item.encounter?.doctor && (
          <Text style={styles.doctor}>Dr. {item.encounter.doctor.firstName} {item.encounter.doctor.lastName}</Text>
        )}
        {item.items.map((drug) => (
          <View key={drug.id} style={styles.drugRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.drugName}>{drug.drug.genericName}</Text>
              {drug.drug.brandName && <Text style={styles.brandName}>{drug.drug.brandName}</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.dosage}>{drug.dosage}</Text>
              <Text style={styles.frequency}>{drug.frequency} × {drug.duration}</Text>
              <Text style={styles.qty}>Qty: {drug.quantity}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>No prescriptions found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 13, color: '#6b7280' },
  doctor: { fontSize: 14, color: '#374151', marginBottom: 8 },
  drugRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  drugName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  brandName: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  dosage: { fontSize: 13, fontWeight: '500', color: '#374151' },
  frequency: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  qty: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
