import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { portalService } from '../services/portal.service';

const TENANT_ID = process.env.EXPO_PUBLIC_TENANT_ID || '';

export default function RegisterScreen({ onNavigateLogin }: { onNavigateLogin: () => void }) {
  const [mrn, setMrn] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (password !== confirmPassword) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (password.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    setIsLoading(true);
    try {
      await portalService.register(TENANT_ID, mrn, phone, password);
      Alert.alert('Success', 'Portal access enabled! You can now login.', [{ text: 'OK', onPress: onNavigateLogin }]);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Please check your details.');
    }
    setIsLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Register for Portal Access</Text>
          <Text style={styles.subtitle}>Use your MRN and phone to verify identity</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Medical Record Number (MRN)</Text>
          <TextInput style={styles.input} value={mrn} onChangeText={setMrn} placeholder="e.g. MRN-2024-0001" />

          <Text style={styles.label}>Phone Number (on file)</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="e.g. 0241234567" keyboardType="phone-pad" />

          <Text style={styles.label}>Create Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Min 6 characters" secureTextEntry />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" secureTextEntry />

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
            {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onNavigateLogin} style={styles.linkContainer}>
            <Text style={styles.linkText}>Already have access? <Text style={styles.linkBold}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f5ff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  button: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkContainer: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#6b7280' },
  linkBold: { color: '#2563eb', fontWeight: '600' },
});
