import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PaymentStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

type NavigationProp = NativeStackNavigationProp<PaymentStackParamList, 'PaymentCheckout'>;
type CheckoutRouteProp = RouteProp<PaymentStackParamList, 'PaymentCheckout'>;


export default function PaymentCheckout() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CheckoutRouteProp>();
  const [ticketCount, setTicketCount] = useState(1);

  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const DEFAULT_ROUTE = {
    id: '1',
    bus: 'BUS 125',
    type: 'Direct service',
    from: 'Horana',
    fromTime: formattedTime,
    to: 'Colombo',
    toTime: '--:--',
    price: 250,
    date: formattedDate
  };

  // Use route parameter if provided, otherwise fallback to default
  const selectedRoute = route.params?.routeData || DEFAULT_ROUTE;
  const totalFare = selectedRoute.price * ticketCount;

  const handleProceed = async () => {
    try {
      const ticketData = { ...selectedRoute, ticketCount, totalFare };
      await AsyncStorage.setItem('@pending_ticket', JSON.stringify(ticketData));
      // Optionally sync to conductor dashboard for testing purposes
      await AsyncStorage.setItem('@conductor_route', JSON.stringify({
        bus: selectedRoute.bus, type: selectedRoute.type, from: selectedRoute.from, fromTime: selectedRoute.fromTime, to: selectedRoute.to, toTime: selectedRoute.toTime, ticketCount, totalFare
      }));
      navigation.navigate('PaymentMethod');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Payment checkout" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Review your journey</Text>
        <Text style={styles.subtitle}>One step closer to your destination.</Text>

        <View style={styles.cardContainer}>
          <View style={styles.routeHeader}>
            <Text style={styles.busBadge}>{selectedRoute.bus}</Text>
            <Text style={styles.busType}>{selectedRoute.type}</Text>
          </View>

          <View style={styles.locationContainer}>
            <View style={styles.locationRow}>
              <View style={styles.dot} />
              <Text style={styles.locationText}>{selectedRoute.from}</Text>
              <Text style={styles.timeText}>{selectedRoute.fromTime}</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.locationRow}>
              <View style={[styles.dot, styles.dotOrange]} />
              <Text style={styles.locationText}>{selectedRoute.to}</Text>
              <Text style={styles.timeText}>{selectedRoute.toTime}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.dateRow}>
            <View style={styles.iconLabel}>
              <Ionicons name="time-outline" size={16} color="#64748b" />
              <Text style={styles.dateLabel}>Travel date</Text>
            </View>
            <View style={styles.dateRight}>
              <Text style={styles.dateValue}>{selectedRoute.date}</Text>
              <Text style={styles.dateTimeValue}>{selectedRoute.fromTime}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.quantityRow}>
            <View>
              <Text style={styles.quantityLabel}>Ticket quantity</Text>
              <Text style={styles.quantitySub}>Adult passenger</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity style={styles.counterButton} onPress={() => setTicketCount(Math.max(1, ticketCount - 1))}>
                <Ionicons name="remove" size={20} color="#0f766e" />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{ticketCount}</Text>
              <TouchableOpacity style={styles.counterButton} onPress={() => setTicketCount(ticketCount + 1)}>
                <Ionicons name="add" size={20} color="#0f766e" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.totalText}>Total fare</Text>
          <Text style={styles.totalAmount}>Rs. {totalFare}</Text>
        </View>

        <View style={styles.secureBadge}>
          <Ionicons name="lock-closed-outline" size={14} color="#0f766e" />
          <Text style={styles.secureText}>Secure card or wallet payment</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleProceed}>
          <Text style={styles.buttonText}>Confirm & pay</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 32 },
  cardContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 4, marginBottom: 32 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  busBadge: { backgroundColor: '#e0f2fe', color: '#0284c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontSize: 13, fontWeight: '700' },
  busType: { fontSize: 13, color: '#64748b' },
  locationContainer: { paddingLeft: 8, marginBottom: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981', marginRight: 16 },
  dotOrange: { backgroundColor: '#f97316' },
  line: { width: 2, height: 24, backgroundColor: '#e2e8f0', marginLeft: 4, marginVertical: -8 },
  locationText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0f172a' },
  timeText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  dateRow: { flexDirection: 'column' },
  iconLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dateLabel: { fontSize: 13, color: '#64748b', marginLeft: 8 },
  dateRight: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateValue: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  dateTimeValue: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quantityLabel: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  quantitySub: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  counter: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  counterButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  counterValue: { width: 40, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#0f172a' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 8 },
  totalText: { fontSize: 16, color: '#64748b' },
  totalAmount: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  secureBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 24 },
  secureText: { fontSize: 13, color: '#0f766e', marginLeft: 8, fontWeight: '500' },
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#0f766e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
