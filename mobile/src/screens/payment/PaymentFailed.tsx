import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentFailed() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Payment status" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="card-outline" size={48} color="#ef4444" />
        </View>

        <Text style={styles.title}>Payment unsuccessful</Text>
        <Text style={styles.subtitle}>Your ticket has not been issued.</Text>

        <View style={styles.detailsCard}>
          <Text style={styles.routeText}>Horana → Colombo</Text>
          <Text style={styles.dateText}>12 Sep 2026 • 08:30 AM</Text>
          <Text style={styles.price}>Rs. 250</Text>
        </View>

        <Text style={styles.note}>Check your payment details and try again.</Text>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('CardPayment')}
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('PaymentMethod')}
          >
            <Text style={styles.secondaryButtonText}>Choose another payment method</Text>
            <Ionicons name="arrow-forward" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 32 },
  detailsCard: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 24 },
  routeText: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  dateText: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  price: { fontSize: 18, color: '#0f172a', fontWeight: '800' },
  note: { fontSize: 13, color: '#64748b', alignSelf: 'flex-start', marginBottom: 40 },
  footer: { width: '100%', marginTop: 'auto' },
  primaryButton: { backgroundColor: '#0f766e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 12, marginBottom: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  secondaryButtonText: { color: '#64748b', fontSize: 15, fontWeight: '600' }
});
