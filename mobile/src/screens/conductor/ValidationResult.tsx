import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function ValidationResult() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const ticketData = route.params?.ticketData || 'Unknown';

  const isValid = ticketData.includes('TKT001') || ticketData.includes('"isValid":true');

  let ticketId = ticketData;
  let fromLoc = 'Horana';
  let toLoc = 'Colombo';
  let dateStr = '12 Sep 2026';
  let timeStr = '08:30 AM';
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
    const updateStatsAndHistory = async () => {
      try {
        const statsJson = await AsyncStorage.getItem('@conductor_stats');
        let stats = statsJson ? JSON.parse(statsJson) : { valid: 35, remaining: 12 };
        
        if (isValid) {
          stats.valid = (stats.valid || 0) + 1;
          stats.remaining = Math.max(0, (stats.remaining || 1) - 1);
        }
        
        await AsyncStorage.setItem('@conductor_stats', JSON.stringify(stats));

        // Save to History
        const historyJson = await AsyncStorage.getItem('@conductor_history');
        const history = historyJson ? JSON.parse(historyJson) : [];
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        history.push({
          ticketId,
          isValid,
          time: formattedTime,
          date: now.toLocaleDateString()
        });
        
        await AsyncStorage.setItem('@conductor_history', JSON.stringify(history));
      } catch (e) {}
    };
    updateStatsAndHistory();
  }, [isValid]);

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
