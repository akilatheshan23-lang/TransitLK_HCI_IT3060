import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { api } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<PaymentStackParamList, 'EWalletPayment'>;
export default function EWalletPayment() {
  const navigation = useNavigation<NavigationProp>();
  const [totalFare, setTotalFare] = useState<number>(0);
  const [routeInfo, setRouteInfo] = useState({ from: '...', to: '...' });
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(1250.00);
  const [idempotencyKey] = useState(() => 'wal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9));

  const newBalance = walletBalance - totalFare;

  useFocusEffect(
    useCallback(() => {
      const loadTicketData = async () => {
        try {
          const stored = await AsyncStorage.getItem('@pending_ticket');
          if (stored) {
            const parsed = JSON.parse(stored);
            setTotalFare(parsed.totalFare || parsed.price || 0);
            if (parsed.from && parsed.to) {
              setRouteInfo({ from: parsed.from, to: parsed.to });
            }
          }

          const balance = await AsyncStorage.getItem('@wallet_balance');
          if (balance) {
            setWalletBalance(parseFloat(balance));
          }
        } catch (e) {}
      };
      loadTicketData();
    }, [])
  );

  const handlePayment = async () => {
    // Prevent accidental duplicate payment submissions
    if (isLoading) return;
    if (newBalance < 0) {
      Alert.alert('Insufficient Balance', 'Please top up your wallet to proceed.');
      return;
    }

    setIsLoading(true);
    try {
      let pendingTicket: any = null;
      try {
        const stored = await AsyncStorage.getItem('@pending_ticket');
        if (stored) pendingTicket = JSON.parse(stored);
      } catch (e) {}

      const fareAmount = totalFare > 0 ? totalFare : (pendingTicket?.totalFare || pendingTicket?.price || 150);
      const fromStation = routeInfo.from !== '...' ? routeInfo.from : (pendingTicket?.from || 'Colombo Fort');
      const toStation = routeInfo.to !== '...' ? routeInfo.to : (pendingTicket?.to || 'Kandy');

      // Process payment with backend server
      const paymentRes = await api.processPayment({
        idempotencyKey,
        amount: fareAmount,
        method: 'wallet',
        routeData: {
          from: fromStation,
          to: toStation,
          bus: pendingTicket?.bus || 'BUS 125',
          fromTime: pendingTicket?.fromTime || '08:30 AM',
          departureTime: pendingTicket?.fromTime || '08:30 AM',
          date: pendingTicket?.date || new Date().toLocaleDateString('en-GB'),
        },
        ticketCount: pendingTicket?.ticketCount || 1,
      });

      if (paymentRes && paymentRes.success && paymentRes.ticket) {
        // Authoritative server-issued ticket ID & verification code
        const authoritativeTicket = {
          ticketId: paymentRes.ticket.ticketId,
          verificationCode: paymentRes.ticket.verificationCode,
          from: paymentRes.ticket.route?.from || fromStation,
          to: paymentRes.ticket.route?.to || toStation,
          busId: paymentRes.ticket.route?.bus || 'BUS 125',
          date: paymentRes.ticket.route?.date || new Date().toLocaleDateString('en-GB'),
          time: paymentRes.ticket.route?.departureTime || '08:30 AM',
          totalFare: fareAmount,
          method: 'TransitLK Wallet',
          status: paymentRes.ticket.status || 'valid',
          isDemo: true,
          qrData: paymentRes.qrData,
        };

        // Deduct wallet balance
        await AsyncStorage.setItem('@wallet_balance', newBalance.toString());
        setWalletBalance(newBalance);

        // Save server-issued ticket as current active ticket
        await AsyncStorage.setItem('@current_ticket', JSON.stringify(authoritativeTicket));

        // Append to offline wallet history
        try {
          const history = await AsyncStorage.getItem('@offline_tickets');
          const parsedHistory = history ? JSON.parse(history) : [];
          parsedHistory.unshift(authoritativeTicket);
          await AsyncStorage.setItem('@offline_tickets', JSON.stringify(parsedHistory));
        } catch (e) {}

        setIsLoading(false);
        navigation.navigate('TicketSummary');
      } else {
        setIsLoading(false);
        Alert.alert('Payment Failed', paymentRes?.message || 'Unable to process demo payment');
      }
    } catch (err: any) {
      setIsLoading(false);
      Alert.alert('Payment Error', err.message || 'Network error processing demo payment');
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <Header title="E-Wallet payment" />

      <View style={styles.content}>
        <Text style={styles.title}>Pay with your wallet</Text>
        <Text style={styles.subtitle}>Confirm your journey payment (DEMO).</Text>

        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletLogo}>TransitLK Wallet</Text>
            <TouchableOpacity onPress={() => navigation.navigate('WalletTopUp')} style={styles.topUpBtn}>
              <Text style={styles.topUpText}>Top Up</Text>
              <Ionicons name="add" size={16} color="#0f766e" />
            </TouchableOpacity>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Available balance</Text>
            <Text style={styles.balanceAmount}>Rs. {walletBalance.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Journey fare</Text>
            <Text style={styles.summaryValue}>Rs. {totalFare.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance after payment</Text>
            <Text style={[styles.summaryValue, newBalance < 0 && styles.negativeValue]}>
              Rs. {newBalance.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.route}>{routeInfo.from} → {routeInfo.to}</Text>
        </View>

        {newBalance < 0 && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text style={styles.errorText}>Please top up your wallet to continue.</Text>
          </View>
        )}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, newBalance < 0 && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={isLoading || newBalance < 0}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>{newBalance < 0 ? 'Insufficient balance' : 'Confirm wallet payment'}</Text>
                <Ionicons name="lock-closed-outline" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, flex: 1 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 28 },
  walletCard: { backgroundColor: '#0f172a', padding: 24, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  walletLogo: { color: '#f8fafc', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  topUpBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ccfbf1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  topUpText: { color: '#0f766e', fontWeight: 'bold', marginRight: 4, fontSize: 13 },
  balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  balanceLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  balanceAmount: { color: '#fff', fontSize: 24, fontWeight: '800' },
  summaryCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryLabel: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  summaryValue: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  negativeValue: { color: '#ef4444' },
  route: { color: '#0f766e', fontSize: 15, fontWeight: '800', marginTop: 8 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginTop: 16 },
  errorText: { color: '#ef4444', marginLeft: 8, fontWeight: '600', fontSize: 14 },
  footer: { marginTop: 'auto', paddingTop: 20 },
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#0f766e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }
});
