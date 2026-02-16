import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { portalService, PortalAppointment } from '../services/portal.service';
import { format } from 'date-fns';

const statusColors: Record<string, { bg: string; text: string }> = {
  SCHEDULED: { bg: '#dbeafe', text: '#1d4ed8' },
  CONFIRMED: { bg: '#e0e7ff', text: '#4338ca' },
  COMPLETED: { bg: '#f3f4f6', text: '#374151' },
  CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
  IN_PROGRESS: { bg: '#fef3c7', text: '#92400e' },
  TRIAGED: { bg: '#e0f2fe', text: '#0369a1' },
};

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await portalService.getAppointments();
      setAppointments(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }: { item: PortalAppointment }) => {
    const sc = statusColors[item.status] || { bg: '#f3f4f6', text: '#374151' };
    return (
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
          </View>
          <Text style={styles.date}>{format(new Date(item.appointmentDate), 'MMM dd, yyyy')}</Text>
        </View>
        <Text style={styles.time}>{item.appointmentTime}</Text>
        {item.doctor && <Text style={styles.doctor}>Dr. {item.doctor.firstName} {item.doctor.lastName}</Text>}
        {item.branch && <Text style={styles.branch}>{item.branch.name}</Text>}
        {item.chiefComplaint && <Text style={styles.complaint}>{item.chiefComplaint}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : <Text style={styles.empty}>No appointments found</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  date: { fontSize: 13, color: '#6b7280' },
  time: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  doctor: { fontSize: 14, color: '#374151' },
  branch: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  complaint: { fontSize: 13, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
