import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function ValidationResult() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const ticketData = route.params?.ticketData || 'Unknown';

  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  let ticketId = ticketData;
  let fromLoc = 'Horana';
  let toLoc = 'Colombo';
  
  const now = new Date();
  let dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  let timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  let priceStr = 'Rs. 250';

  // Try to parse dynamic data if the QR code contains JSON (e.g., from Passenger flow)
  try {
    const parsed = JSON.parse(ticketData);
    if (parsed.id) ticketId = parsed.id;
    if (parsed.from) fromLoc = parsed.from;
    if (parsed.to) toLoc = parsed.to;
    if (parsed.date) dateStr = parsed.date;
    if (parsed.time) timeStr = parsed.time;
    if (parsed.price) priceStr = parsed.price;
  } catch (e) {
    // Fallback to defaults if it's just a raw string like "TKT001"
  }

  useEffect(() => {
    const validateTicket = async () => {
      try {
        const scannedJson = await AsyncStorage.getItem('@scanned_tickets_v3');
        const scannedTickets = scannedJson ? JSON.parse(scannedJson) : [];
        
        let validStatus = false;
        if (scannedTickets.includes(ticketId)) {
          validStatus = false; // Already scanned
        } else {
          validStatus = true; // New ticket
          scannedTickets.push(ticketId);
          await AsyncStorage.setItem('@scanned_tickets_v3', JSON.stringify(scannedTickets));
        }
        
        setIsValid(validStatus);

        const activeTrip = await AsyncStorage.getItem('@active_trip_v3') || 'trip1';
        const statsJson = await AsyncStorage.getItem('@conductor_stats_v3');
        let stats = statsJson ? JSON.parse(statsJson) : { trip1: { valid: 0, revenue: 0 }, trip2: { valid: 0, revenue: 0 }, invalid: 0 };
        
        if (typeof stats.valid === 'number' && !stats.trip1) {
          stats = {
            trip1: { valid: stats.valid, revenue: stats.revenue || (stats.valid * 250) },
            trip2: { valid: 0, revenue: 0 },
            invalid: stats.invalid || 0
          };
        }
        
        const fare = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 250;
        const numberOfTickets = Math.max(1, Math.round(fare / 250));

        if (validStatus) {
          if (!stats[activeTrip]) stats[activeTrip] = { valid: 0, revenue: 0 };
          stats[activeTrip].valid = (stats[activeTrip].valid || 0) + numberOfTickets;
          stats[activeTrip].revenue = (stats[activeTrip].revenue || 0) + fare;
        } else {
          stats.invalid = (stats.invalid || 0) + 1;
        }
        
        await AsyncStorage.setItem('@conductor_stats_v3', JSON.stringify(stats));

        // Save to History
        const historyJson = await AsyncStorage.getItem('@conductor_history_v3');
        const history = historyJson ? JSON.parse(historyJson) : [];
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        history.push({
          ticketId,
          isValid: validStatus,
          time: formattedTime,
          date: now.toLocaleDateString()
        });
        
        await AsyncStorage.setItem('@conductor_history_v3', JSON.stringify(history));
      } catch (e) {
        setIsValid(false);
      } finally {
        setIsChecking(false);
      }
    };
    validateTicket();
  }, [ticketId]);

  if (isChecking || isValid === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Ticket check" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={{ marginTop: 16, color: '#64748b' }}>Verifying ticket...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={isValid ? "Ticket validated" : "Ticket check"} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: isValid ? '#ccfbf1' : '#fee2e2' }]}>
          <Ionicons name={isValid ? "checkmark-sharp" : "close-sharp"} size={48} color={isValid ? '#0f766e' : '#ef4444'} />
        </View>

        <Text style={styles.title}>
          {isValid ? 'Valid ticket' : 'Ticket not valid'}
        </Text>
        
        <Text style={styles.subtitle}>
          {isValid ? 'Passenger is ready to board.' : 'This ticket has expired.'}
        </Text>

        <View style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Ticket ID</Text>
            <Text style={styles.value}>{ticketId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.value}>{fromLoc}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>To</Text>
            <Text style={styles.value}>{toLoc}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{dateStr}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{timeStr}</Text>
          </View>
          <Text style={styles.price}>{priceStr}</Text>
          
          {!isValid && (
            <Text style={styles.invalidNote}>Check the date with the passenger.</Text>
          )}
        </View>

        <View style={styles.footer}>
          {isValid ? (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => navigation.navigate('ConductorDashboard')}
            >
              <Text style={styles.primaryButtonText}>Done - Scan next ticket</Text>
              <Ionicons name="scan-outline" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.primaryButtonText}>Scan again</Text>
                <Ionicons name="scan-outline" size={20} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => navigation.navigate('ManualCheck')}
              >
                <Text style={styles.secondaryButtonText}>Enter ticket ID manually</Text>
                <Ionicons name="arrow-forward" size={18} color="#64748b" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 32 },
  detailsCard: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  value: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  price: { fontSize: 18, color: '#0f766e', fontWeight: '800', marginTop: 16 },
  invalidNote: { marginTop: 16, fontSize: 13, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  footer: { width: '100%', marginTop: 'auto' },
  primaryButton: { backgroundColor: '#0f766e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 12, marginBottom: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  secondaryButtonText: { color: '#64748b', fontSize: 15, fontWeight: '600' }
});
