import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import { portalService, PortalNotification } from '../services/portal.service';
import { format } from 'date-fns';

const typeIcons: Record<string, { icon: string; color: string }> = {
  LAB_RESULT: { icon: '🧪', color: '#22c55e' },
  APPOINTMENT: { icon: '📅', color: '#3b82f6' },
  BILLING: { icon: '💳', color: '#f59e0b' },
  PRESCRIPTION: { icon: '💊', color: '#8b5cf6' },
  GENERAL: { icon: '🔔', color: '#6b7280' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setNotifications(await portalService.getNotifications());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markRead = async (id: string) => {
    try {
      await portalService.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
  };

  const renderItem = ({ item }: { item: PortalNotification }) => {
    const ti = typeIcons[item.type] || typeIcons.GENERAL;
    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unread]}
        onPress={() => !item.isRead && markRead(item.id)}
        activeOpacity={item.isRead ? 1 : 0.7}
      >
        <View style={styles.row}>
          <Text style={styles.icon}>{ti.icon}</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>{item.title}</Text>
              {!item.isRead && <View style={[styles.dot, { backgroundColor: ti.color }]} />}
            </View>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
            <Text style={styles.time}>{format(new Date(item.createdAt), 'MMM dd, h:mm a')}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <Text style={styles.unreadText}>{unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</Text>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>No notifications</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  unreadBanner: { backgroundColor: '#eff6ff', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#dbeafe' },
  unreadText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  unread: { backgroundColor: '#f0f5ff', borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { fontSize: 22, marginTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '500', color: '#374151', flex: 1 },
  titleUnread: { fontWeight: '700', color: '#111827' },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  message: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  time: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
