import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PaymentStackParamList } from '../../navigation/navigationTypes';
import { platformShadow } from '../../theme/shadows';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

type NavigationProp = NativeStackNavigationProp<PaymentStackParamList, 'PaymentMethod'>;

export default function PaymentMethod() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'wallet'>('card');
  const [totalFare, setTotalFare] = useState<number>(0);

  useEffect(() => {
    const loadTicketData = async () => {
      try {
        const stored = await AsyncStorage.getItem('@pending_ticket');
        if (stored) {
          const parsed = JSON.parse(stored);
          setTotalFare(parsed.totalFare || parsed.price || 0);
        }
      } catch (e) {}
    };
    loadTicketData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Payment method" />

      <View style={styles.content}>
        <Text style={styles.title}>Choose how to pay</Text>
        <Text style={styles.subtitle}>Your payment is secure and encrypted.</Text>

        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'card' && styles.methodCardSelected]}
          onPress={() => setSelectedMethod('card')}
          activeOpacity={0.8}
        >
          <View style={[styles.methodIcon, selectedMethod === 'card' && styles.methodIconSelected]}>
            <Ionicons name="card-outline" size={24} color={selectedMethod === 'card' ? '#0f766e' : '#64748b'} />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={styles.methodTitle}>Credit / debit card</Text>
            <Text style={styles.methodSubtitle}>Visa • Mastercard</Text>
          </View>
          <View style={[styles.radio, selectedMethod === 'card' && styles.radioSelected]}>
            {selectedMethod === 'card' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.methodCard, selectedMethod === 'wallet' && styles.methodCardSelected]}
          onPress={() => setSelectedMethod('wallet')}
          activeOpacity={0.8}
        >
          <View style={[styles.methodIcon, selectedMethod === 'wallet' && styles.methodIconSelected]}>
            <Ionicons name="wallet-outline" size={24} color={selectedMethod === 'wallet' ? '#0f766e' : '#64748b'} />
          </View>
          <View style={styles.methodTextContainer}>
            <Text style={styles.methodTitle}>E-Wallet</Text>
            <Text style={styles.methodSubtitle}>Pay using your digital wallet</Text>
          </View>
          <View style={[styles.radio, selectedMethod === 'wallet' && styles.radioSelected]}>
            {selectedMethod === 'wallet' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.totalText}>AMOUNT TO PAY</Text>
          <Text style={styles.totalAmount}>Rs. {totalFare.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (selectedMethod === 'card') {
              navigation.navigate('CardPayment');
            } else {
              navigation.navigate('EWalletPayment');
            }
          }}
        >
          <Text style={styles.buttonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 20, flex: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 28 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 2, borderColor: 'transparent', ...platformShadow({ color: '#000', width: 0, height: 4, opacity: 0.05, radius: 8, elevation: 3 }) },
  methodCardSelected: { borderColor: '#14b8a6', backgroundColor: '#f0fdfa', ...platformShadow({ color: '#14b8a6', width: 0, height: 4, opacity: 0.15, radius: 8, elevation: 6 }) },
  methodIcon: { width: 48, height: 48, backgroundColor: '#f1f5f9', borderRadius: 12, marginRight: 16, justifyContent: 'center', alignItems: 'center' },
  methodIconSelected: { backgroundColor: '#ccfbf1' },
  methodTextContainer: { flex: 1 },
  methodTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  methodSubtitle: { fontSize: 13, color: '#64748b' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center' },
  radioSelected: { borderColor: '#0f766e' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#0f766e' },
  footer: { marginTop: 'auto', marginBottom: 20, alignItems: 'center' },
  totalText: { fontSize: 13, color: '#64748b', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: '#0f172a' },
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center', ...platformShadow({ color: '#0f766e', width: 0, height: 8, opacity: 0.3, radius: 16, elevation: 6 }) },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }
});
