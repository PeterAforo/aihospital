import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { doctorService, PatientSummary } from '../services/doctor.service';

export default function PatientSearchScreen({ navigation }: any) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!user || !query.trim()) return;
    setLoading(true);
    try { const data = await doctorService.searchPatients(user.tenantId, query.trim()); setResults(data); } catch { /* */ }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <View style={s.searchBar}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput style={s.searchInput} value={query} onChangeText={setQuery} placeholder="Search by name, MRN, phone..." onSubmitEditing={search} returnKeyType="search" autoFocus />
      </View>
      <FlatList data={results} keyExtractor={i => i.id} contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={s.empty}>{loading ? 'Searching...' : query ? 'No patients found' : 'Enter a search term'}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('PatientDetail', { patientId: item.id })}>
            <View style={s.avatarCircle}><Text style={s.avatarText}>{item.firstName?.[0]}{item.lastName?.[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.firstName} {item.lastName}</Text>
              <Text style={s.sub}>MRN: {item.mrn} | {item.gender || 'N/A'}</Text>
              {item.phone && <Text style={s.sub}>{item.phone}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 0, borderRadius: 12, paddingHorizontal: 14, gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#059669' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
