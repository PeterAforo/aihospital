import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { portalService, PortalInvoice } from '../services/portal.service';
import { format } from 'date-fns';

const statusColors: Record<string, { bg: string; text: string }> = {
  PAID: { bg: '#dcfce7', text: '#15803d' },
  PARTIALLY_PAID: { bg: '#fef3c7', text: '#92400e' },
  PENDING: { bg: '#fee2e2', text: '#991b1b' },
  OVERDUE: { bg: '#fee2e2', text: '#991b1b' },
  CANCELLED: { bg: '#f3f4f6', text: '#6b7280' },
};

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setInvoices(await portalService.getInvoices());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handlePay = async (invoice: PortalInvoice) => {
    if (invoice.balanceDue <= 0) return;
    setPayingId(invoice.id);
    try {
      const { authorization_url } = await portalService.initializePayment(invoice.id);
      await Linking.openURL(authorization_url);
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Could not initialize payment');
    }
    setPayingId(null);
  };

  const formatCurrency = (amount: number) => `GH₵ ${amount.toFixed(2)}`;

  const renderItem = ({ item }: { item: PortalInvoice }) => {
    const sc = statusColors[item.status] || { bg: '#f3f4f6', text: '#374151' };
    const canPay = item.balanceDue > 0 && item.status !== 'CANCELLED';

    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.invoiceNum}>{item.invoiceNumber}</Text>
          <View style={[styles.badge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.badgeText, { color: sc.text }]}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>
        <Text style={styles.date}>{format(new Date(item.createdAt), 'MMM dd, yyyy')}</Text>

        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>{formatCurrency(item.totalAmount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amountValue, { color: '#15803d' }]}>{formatCurrency(item.paidAmount)}</Text>
          </View>
          {item.balanceDue > 0 && (
            <View style={styles.amountRow}>
              <Text style={[styles.amountLabel, { fontWeight: '600' }]}>Balance Due</Text>
              <Text style={[styles.amountValue, { color: '#dc2626', fontWeight: '700' }]}>{formatCurrency(item.balanceDue)}</Text>
            </View>
          )}
        </View>

        {canPay && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handlePay(item)}
            disabled={payingId === item.id}
          >
            {payingId === item.id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.payButtonText}>Pay Now</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? null : <Text style={styles.empty}>No invoices found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  invoiceNum: { fontSize: 15, fontWeight: '600', color: '#111827' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  date: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  amountSection: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 10 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  amountLabel: { fontSize: 14, color: '#6b7280' },
  amountValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  payButton: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  payButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
