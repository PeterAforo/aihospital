import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService } from '../services/doctor.service';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ todayAppointments: 0, pendingEncounters: 0, inpatientCount: 0, pendingLabResults: 0 });

  const refresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const d = await doctorService.getDashboard(user.tenantId);
      setStats(d);
    } catch { /* ignore */ }
    setRefreshing(false);
  }, [user]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const cards = [
    { label: 'Today\'s Appointments', value: stats.todayAppointments, icon: 'calendar' as const, color: '#059669', screen: 'Appointments' },
    { label: 'Active Encounters', value: stats.pendingEncounters, icon: 'document-text' as const, color: '#2563eb', screen: 'Encounters' },
    { label: 'Inpatients', value: stats.inpatientCount, icon: 'bed' as const, color: '#7c3aed', screen: 'Inpatients' },
    { label: 'Lab Results', value: stats.pendingLabResults, icon: 'flask' as const, color: '#ea580c', screen: 'LabOrders' },
  ];

  const quickActions = [
    { label: 'Patient Search', icon: 'search' as const, screen: 'PatientSearch' },
    { label: 'Prescriptions', icon: 'medical' as const, screen: 'Prescriptions' },
    { label: 'Notifications', icon: 'notifications' as const, screen: 'Notifications' },
  ];

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#059669" />}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'},</Text>
          <Text style={s.name}>Dr. {user?.firstName} {user?.lastName}</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={s.avatar}>
          <Ionicons name="person-circle" size={40} color="#059669" />
        </TouchableOpacity>
      </View>

      <View style={s.grid}>
        {cards.map((c, i) => (
          <TouchableOpacity key={i} style={[s.card, { borderLeftColor: c.color }]} onPress={() => navigation.navigate(c.screen)}>
            <Ionicons name={c.icon} size={24} color={c.color} />
            <Text style={s.cardValue}>{c.value}</Text>
            <Text style={s.cardLabel}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.sectionTitle}>Quick Actions</Text>
      <View style={s.actions}>
        {quickActions.map((a, i) => (
          <TouchableOpacity key={i} style={s.action} onPress={() => navigation.navigate(a.screen)}>
            <View style={s.actionIcon}><Ionicons name={a.icon} size={22} color="#059669" /></View>
            <Text style={s.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  greeting: { fontSize: 14, color: '#6b7280' },
  name: { fontSize: 22, fontWeight: '700', color: '#111827' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  cardValue: { fontSize: 28, fontWeight: '800', color: '#111827', marginTop: 8 },
  cardLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginLeft: 20, marginTop: 24, marginBottom: 12 },
  actions: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  action: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', textAlign: 'center' },
});
