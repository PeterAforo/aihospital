import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService, Notification } from '../services/doctor.service';

const typeIcons: Record<string, string> = { CRITICAL: 'alert-circle', LAB_RESULT: 'flask', APPOINTMENT: 'calendar', GENERAL: 'notifications' };
const typeColors: Record<string, string> = { CRITICAL: '#dc2626', LAB_RESULT: '#ea580c', APPOINTMENT: '#2563eb', GENERAL: '#6b7280' };

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user) return;
    setRefreshing(true);
    try { setItems(await doctorService.getNotifications(user.id)); } catch { /* */ }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (id: string) => {
    try { await doctorService.markNotificationRead(id); setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n)); } catch { /* */ }
  };

  return (
    <View style={s.container}>
      <FlatList data={items} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#059669" />}
        ListEmptyComponent={<Text style={s.empty}>No notifications</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={[s.card, !item.isRead && s.unread]} onPress={() => !item.isRead && markRead(item.id)}>
            <View style={[s.iconWrap, { backgroundColor: (typeColors[item.type] || '#6b7280') + '15' }]}>
              <Ionicons name={(typeIcons[item.type] || 'notifications') as any} size={20} color={typeColors[item.type] || '#6b7280'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.msg} numberOfLines={2}>{item.message}</Text>
              <Text style={s.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {!item.isRead && <View style={s.dot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  unread: { backgroundColor: '#ecfdf5', borderLeftWidth: 3, borderLeftColor: '#059669' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  msg: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  time: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
