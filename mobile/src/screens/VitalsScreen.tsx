import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { portalService, PortalVital } from '../services/portal.service';
import { format } from 'date-fns';

function VitalRow({ label, value, unit, warn }: { label: string; value?: number; unit: string; warn?: boolean }) {
  if (value === undefined || value === null) return null;
  return (
    <View style={styles.vitalRow}>
      <Text style={styles.vitalLabel}>{label}</Text>
      <Text style={[styles.vitalValue, warn && styles.vitalWarn]}>{value} {unit}</Text>
    </View>
  );
}

export default function VitalsScreen() {
  const [vitals, setVitals] = useState<PortalVital[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setVitals(await portalService.getVitals());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }: { item: PortalVital }) => {
    const bp = item.bloodPressureSystolic && item.bloodPressureDiastolic
      ? `${item.bloodPressureSystolic}/${item.bloodPressureDiastolic}`
      : undefined;
    const highBP = (item.bloodPressureSystolic ?? 0) >= 140 || (item.bloodPressureDiastolic ?? 0) >= 90;

    return (
      <View style={styles.card}>
        <Text style={styles.date}>{format(new Date(item.recordedAt), 'MMM dd, yyyy  h:mm a')}</Text>
        <View style={styles.grid}>
          <VitalRow label="Temperature" value={item.temperature} unit="°C" warn={(item.temperature ?? 0) >= 38} />
          {bp && (
            <View style={styles.vitalRow}>
              <Text style={styles.vitalLabel}>Blood Pressure</Text>
              <Text style={[styles.vitalValue, highBP && styles.vitalWarn]}>{bp} mmHg</Text>
            </View>
          )}
          <VitalRow label="Heart Rate" value={item.heartRate} unit="bpm" warn={(item.heartRate ?? 0) > 100} />
          <VitalRow label="Resp. Rate" value={item.respiratoryRate} unit="/min" warn={(item.respiratoryRate ?? 0) > 20} />
          <VitalRow label="SpO₂" value={item.oxygenSaturation} unit="%" warn={(item.oxygenSaturation ?? 100) < 95} />
          <VitalRow label="Weight" value={item.weight} unit="kg" />
          <VitalRow label="Height" value={item.height} unit="cm" />
          <VitalRow label="BMI" value={item.bmi} unit="" warn={(item.bmi ?? 0) >= 30} />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={vitals}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>No vitals recorded</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  date: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 12 },
  grid: {},
  vitalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  vitalLabel: { fontSize: 14, color: '#6b7280' },
  vitalValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  vitalWarn: { color: '#dc2626' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
