import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { platformShadow } from '../../theme/shadows';

export default function ManualCheck() {
  const [ticketId, setTicketId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const navigation = useNavigation<any>();

  const handleVerify = () => {
    if (!ticketId.trim()) return;
    setIsVerifying(true);

    // Mock backend delay
    setTimeout(() => {
      setIsVerifying(false);
      navigation.navigate('ValidationResult', { ticketData: ticketId });
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Manual Ticket Check" />

      <View style={styles.content}>
        <Ionicons name="keypad-outline" size={64} color="#cbd5e1" style={{ alignSelf: 'center', marginBottom: 24 }} />

        <Text style={styles.title}>Enter Ticket or Code</Text>
        <Text style={styles.subtitle}>Use this when the QR code cannot be scanned. Enter Ticket ID or 5-Digit Verification Code.</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="e.g., TKT001 or 12345"
            value={ticketId}
            onChangeText={setTicketId}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, !ticketId.trim() && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={!ticketId.trim() || isVerifying}
        >
          {isVerifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Ticket</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 24, flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32 },
  inputContainer: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 24, overflow: 'hidden' },
  input: { padding: 16, fontSize: 18, textAlign: 'center', fontWeight: '600', color: '#0f172a' },
  button: { backgroundColor: '#0f766e', padding: 18, borderRadius: 12, alignItems: 'center', ...platformShadow({ color: '#0f766e', width: 0, height: 4, opacity: 0.3, radius: 8, elevation: 4 }) },
  buttonDisabled: { backgroundColor: '#94a3b8', ...Platform.select({ web: { boxShadow: 'none' } as any, default: { shadowOpacity: 0, elevation: 0 } }) },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 }
});
