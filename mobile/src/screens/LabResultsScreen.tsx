import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { portalService, PortalLabOrder } from '../services/portal.service';
import { format } from 'date-fns';

export default function LabResultsScreen() {
  const [orders, setOrders] = useState<PortalLabOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setOrders(await portalService.getLabResults()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }: { item: PortalLabOrder }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{item.id.slice(0, 8)}</Text>
        <View style={[styles.badge, { backgroundColor: item.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7' }]}>
          <Text style={[styles.badgeText, { color: item.status === 'COMPLETED' ? '#15803d' : '#92400e' }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <Text style={styles.date}>{format(new Date(item.orderDate), 'MMM dd, yyyy')}</Text>
      {item.items.map((test) => (
        <View key={test.id} style={styles.testRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.testName}>{test.test.name}</Text>
            <Text style={styles.testCode}>{test.test.code}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {test.result || test.resultValue !== undefined ? (
              <Text style={[styles.result, test.isCritical ? styles.critical : test.isAbnormal ? styles.abnormal : {}]}>
                {test.resultValue ?? test.result} {test.unit || ''}
              </Text>
            ) : (
              <Text style={styles.pending}>Pending</Text>
            )}
            {test.normalRange && <Text style={styles.range}>Ref: {test.normalRange}</Text>}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>No lab results found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 15, fontWeight: '600', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  testRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  testName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  testCode: { fontSize: 12, color: '#9ca3af' },
  result: { fontSize: 14, fontWeight: '600', color: '#111827' },
  critical: { color: '#dc2626' },
  abnormal: { color: '#d97706' },
  pending: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic' },
  range: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
