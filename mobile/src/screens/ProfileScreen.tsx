import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { portalService } from '../services/portal.service';

export default function ProfileScreen() {
  const { patient, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setProfile(await portalService.getProfile()); } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{patient?.firstName?.[0]}{patient?.lastName?.[0]}</Text>
        </View>
        <Text style={styles.name}>{profile?.title} {profile?.firstName} {profile?.lastName}</Text>
        <Text style={styles.mrn}>MRN: {profile?.mrn}</Text>
        <Text style={styles.info}>{profile?.gender} • DOB: {profile?.dateOfBirth?.slice(0, 10)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <InfoRow label="Phone" value={profile?.phonePrimary} />
        <InfoRow label="Email" value={profile?.email || '—'} />
        <InfoRow label="Address" value={[profile?.address, profile?.city, profile?.region].filter(Boolean).join(', ')} />
      </View>

      {profile?.allergies?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          {profile.allergies.map((a: any) => (
            <View key={a.id} style={styles.infoRow}>
              <Text style={styles.allergen}>{a.allergen}</Text>
              <Text style={styles.severity}>{a.severity}</Text>
            </View>
          ))}
        </View>
      )}

      {profile?.chronicConditions?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chronic Conditions</Text>
          {profile.chronicConditions.map((c: any) => (
            <Text key={c.id} style={styles.conditionText}>{c.conditionName}</Text>
          ))}
        </View>
      )}

      {profile?.nhisInfo && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NHIS Information</Text>
          <InfoRow label="NHIS Number" value={profile.nhisInfo.nhisNumber} />
          {profile.nhisInfo.expiryDate && <InfoRow label="Expires" value={profile.nhisInfo.expiryDate.slice(0, 10)} />}
        </View>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#2563eb' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  mrn: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  info: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  section: { margin: 16, marginBottom: 0, backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, color: '#111827', fontWeight: '500', flex: 1, textAlign: 'right' },
  allergen: { fontSize: 14, color: '#111827', fontWeight: '500' },
  severity: { fontSize: 13, color: '#dc2626' },
  conditionText: { fontSize: 14, color: '#374151', paddingVertical: 6 },
  logoutButton: { margin: 16, backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
});
