import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { portalService, DashboardStats } from '../services/portal.service';

export default function HomeScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { patient } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await portalService.getDashboard();
      setStats(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const cards = [
    { label: 'Upcoming\nAppointments', value: stats?.upcomingAppointments ?? 0, color: '#3b82f6', tab: 'appointments' },
    { label: 'Pending\nBills', value: stats?.pendingInvoices ?? 0, color: '#f59e0b', tab: 'invoices' },
    { label: 'Recent\nLab Results', value: stats?.recentLabResults ?? 0, color: '#22c55e', tab: 'lab' },
    { label: 'Recent\nPrescriptions', value: stats?.recentPrescriptions ?? 0, color: '#8b5cf6', tab: 'prescriptions' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.greeting}>
        <Text style={styles.greetingText}>Welcome back,</Text>
        <Text style={styles.nameText}>{patient?.firstName} {patient?.lastName}</Text>
        <Text style={styles.mrnText}>MRN: {patient?.mrn}</Text>
      </View>

      <View style={styles.grid}>
        {cards.map((card) => (
          <TouchableOpacity key={card.tab} style={[styles.card, { borderLeftColor: card.color }]} onPress={() => onNavigate(card.tab)}>
            <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        {[
          { label: 'View upcoming appointments', tab: 'appointments' },
          { label: 'Check lab results', tab: 'lab' },
          { label: 'View prescriptions', tab: 'prescriptions' },
          { label: 'Pay outstanding bills', tab: 'invoices' },
        ].map((action) => (
          <TouchableOpacity key={action.tab} style={styles.actionRow} onPress={() => onNavigate(action.tab)}>
            <Text style={styles.actionText}>{action.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  greeting: { padding: 20, paddingTop: 16 },
  greetingText: { fontSize: 16, color: '#6b7280' },
  nameText: { fontSize: 24, fontWeight: '700', color: '#111827', marginTop: 2 },
  mrnText: { fontSize: 13, color: '#9ca3af', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  card: {
    width: '46%', margin: '2%', backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardValue: { fontSize: 28, fontWeight: '700' },
  cardLabel: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  section: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  actionText: { fontSize: 15, color: '#374151' },
  arrow: { fontSize: 20, color: '#9ca3af' },
});
