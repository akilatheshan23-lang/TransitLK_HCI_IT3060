import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PaymentStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

type NavigationProp = NativeStackNavigationProp<PaymentStackParamList, 'TicketSummary'>;

export default function TicketSummary() {
  const navigation = useNavigation<NavigationProp>();
  const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    const finalizeTicket = async () => {
      try {
        const pendingStr = await AsyncStorage.getItem('@pending_ticket');
        if (pendingStr) {
          const route = JSON.parse(pendingStr);
          const finalTicket = {
            id: `TKT${Math.floor(Math.random() * 10000)}`,
            verificationCode: Math.floor(10000 + Math.random() * 90000).toString(),
            from: route.from,
            to: route.to,
            date: route.date,
            time: route.fromTime,
            price: `Rs. ${route.totalFare ? route.totalFare.toFixed(2) : route.price.toFixed(2)}`,
            ticketCount: route.ticketCount || 1,
            bus: route.bus,
            savedAt: new Date().toLocaleDateString()
          };
          setTicketData(finalTicket);

          // Save as current for MyETicket
          await AsyncStorage.setItem('@current_ticket', JSON.stringify(finalTicket));

          // Save to offline wallet
          const offlineStr = await AsyncStorage.getItem('@offline_tickets');
          const offlineTickets = offlineStr ? JSON.parse(offlineStr) : [];
          // Prepend new ticket
          await AsyncStorage.setItem('@offline_tickets', JSON.stringify([finalTicket, ...offlineTickets]));
        }
      } catch (e) {}
    };
    finalizeTicket();
  }, []);

  if (!ticketData) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Ticket summary" />
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Ticket summary" />

      <View style={styles.content}>
        <View style={styles.successIconContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-sharp" size={36} color="#059669" />
          </View>
        </View>

        <Text style={styles.title}>You are ready to ride!</Text>
        <Text style={styles.subtitle}>Your payment was successful.</Text>

        <View style={styles.ticketCard}>
          <Text style={styles.route}>{ticketData.from} → {ticketData.to}</Text>
          <Text style={styles.datetime}>{ticketData.date} • {ticketData.time}</Text>

          <View style={styles.divider} />

          <View style={styles.ticketDetailsRow}>
            <Text style={styles.ticketId}>{ticketData.id}</Text>
            <Text style={styles.ticketPrice}>{ticketData.price}</Text>
          </View>

          <View style={styles.ticketDetailsRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PAID</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('MyETicket')}>
              <Text style={styles.viewTicketText}>View ticket</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.paymentDetails}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total paid</Text>
            <Text style={styles.summaryValue}>{ticketData.price}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment</Text>
            <Text style={styles.summaryValue}>Card •••• 3456</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('MyETicket')}
          >
            <Text style={styles.buttonText}>View QR ticket</Text>
            <Ionicons name="scan-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, flex: 1, alignItems: 'center' },
  successIconContainer: { marginTop: 32, marginBottom: 20 },
  successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#d1fae5', justifyContent: 'center', alignItems: 'center', shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, color: '#4b5563', marginBottom: 32, textAlign: 'center' },
  ticketCard: { backgroundColor: '#fff', padding: 24, borderRadius: 20, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 6, marginBottom: 32 },
  route: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  datetime: { fontSize: 14, color: '#6b7280', marginBottom: 20, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 20 },
  ticketDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ticketId: { fontSize: 16, color: '#6b7280', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '600' },
  ticketPrice: { fontSize: 20, fontWeight: '800', color: '#111827' },
  badge: { backgroundColor: '#cffafe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  badgeText: { color: '#0891b2', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  viewTicketText: { color: '#0f766e', fontSize: 16, fontWeight: '700' },
  paymentDetails: { width: '100%', paddingHorizontal: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  summaryLabel: { color: '#4b5563', fontSize: 15, fontWeight: '500' },
  summaryValue: { color: '#111827', fontSize: 15, fontWeight: '700' },
  footer: { marginTop: 'auto', paddingTop: 20, width: '100%' },
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center', width: '100%', shadowColor: '#0f766e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }
});
