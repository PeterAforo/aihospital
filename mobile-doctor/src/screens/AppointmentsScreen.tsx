import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService, Appointment } from '../services/doctor.service';

const statusColors: Record<string, string> = { SCHEDULED: '#2563eb', CHECKED_IN: '#059669', IN_PROGRESS: '#ca8a04', COMPLETED: '#16a34a', CANCELLED: '#dc2626', NO_SHOW: '#9ca3af' };

export default function AppointmentsScreen() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try { const data = await doctorService.getAppointments(user.tenantId, user.id); setAppointments(data); } catch { /* */ }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [user]);

  const renderItem = ({ item }: { item: Appointment }) => (
    <View style={s.card}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.patientName}>{item.patient?.firstName} {item.patient?.lastName}</Text>
          <Text style={s.mrn}>MRN: {item.patient?.mrn}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: (statusColors[item.status] || '#6b7280') + '20' }]}>
          <Text style={[s.badgeText, { color: statusColors[item.status] || '#6b7280' }]}>{item.status}</Text>
        </View>
      </View>
      <View style={s.details}>
        <View style={s.detailRow}><Ionicons name="time-outline" size={14} color="#6b7280" /><Text style={s.detailText}>{item.appointmentTime || 'N/A'}</Text></View>
        {item.chiefComplaint && <View style={s.detailRow}><Ionicons name="chatbubble-outline" size={14} color="#6b7280" /><Text style={s.detailText}>{item.chiefComplaint}</Text></View>}
        {item.branch && <View style={s.detailRow}><Ionicons name="location-outline" size={14} color="#6b7280" /><Text style={s.detailText}>{item.branch.name}</Text></View>}
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList data={appointments} keyExtractor={i => i.id} renderItem={renderItem} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#059669" />} contentContainerStyle={{ padding: 16 }} ListEmptyComponent={<Text style={s.empty}>No appointments found</Text>} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  mrn: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  details: { marginTop: 10, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#6b7280' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
