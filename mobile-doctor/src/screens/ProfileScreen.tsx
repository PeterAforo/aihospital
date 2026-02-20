import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const rows = [
    { label: 'Name', value: `Dr. ${user?.firstName} ${user?.lastName}`, icon: 'person' as const },
    { label: 'Email', value: user?.email || 'N/A', icon: 'mail' as const },
    { label: 'Role', value: user?.role || 'N/A', icon: 'shield-checkmark' as const },
    { label: 'Tenant', value: user?.tenantId?.slice(0, 8) || 'N/A', icon: 'business' as const },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 20 }}>
      <View style={s.avatarSection}>
        <View style={s.avatar}><Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text></View>
        <Text style={s.name}>Dr. {user?.firstName} {user?.lastName}</Text>
        <Text style={s.role}>{user?.role}</Text>
      </View>
      <View style={s.card}>
        {rows.map((r, i) => (
          <View key={i} style={[s.row, i < rows.length - 1 && s.rowBorder]}>
            <Ionicons name={r.icon} size={20} color="#059669" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.label}>{r.label}</Text>
              <Text style={s.value}>{r.value}</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 12, color: '#6b7280' },
  value: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fef2f2', borderRadius: 14, padding: 16, marginTop: 24 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
});
