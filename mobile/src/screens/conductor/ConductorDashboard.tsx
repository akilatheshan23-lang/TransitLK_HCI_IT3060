import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

export default function ConductorDashboard() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({ valid: 35, remaining: 12 });
  const [routeInfo, setRouteInfo] = useState({
    bus: 'BUS 125',
    type: 'Direct service',
    from: 'Horana',
    fromTime: '08:30 AM',
    to: 'Colombo',
    toTime: '10:00 AM'
  });

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          // Load Stats
          const statsJson = await AsyncStorage.getItem('@conductor_stats');
          if (statsJson) {
            const data = JSON.parse(statsJson);
            setStats({ valid: data.valid || 0, remaining: data.remaining || 0 });
          } else {
            // Initialize default stats for testing
            const defaultStats = { valid: 35, remaining: 12 };
            await AsyncStorage.setItem('@conductor_stats', JSON.stringify(defaultStats));
            setStats(defaultStats);
          }

          // Load Dynamic Route Info (if set elsewhere)
          const routeJson = await AsyncStorage.getItem('@conductor_route');
          if (routeJson) {
            setRouteInfo(JSON.parse(routeJson));
          }
        } catch (e) {}
      };
      loadData();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Conductor dashboard" />
      
      <ScrollView style={styles.content}>
        <View style={styles.badgeContainer}>
          <Text style={styles.dutyBadge}>ON DUTY</Text>
        </View>
        
        <Text style={styles.greeting}>Hello, Kamal</Text>
        <Text style={styles.subtitle}>Let's keep the journey moving.</Text>

        <View style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <View style={styles.busBadge}><Text style={styles.busBadgeText}>{routeInfo.bus}</Text></View>
            <Text style={styles.serviceText}>{routeInfo.type}</Text>
          </View>
          
          <View style={styles.routeRow}>
            <View style={styles.dotTeal} />
            <Text style={styles.locationText}>{routeInfo.from}</Text>
            <Text style={styles.timeText}>{routeInfo.fromTime}</Text>
          </View>
          
          <View style={styles.routeRow}>
            <View style={styles.dotOrange} />
            <Text style={styles.locationText}>{routeInfo.to}</Text>
            <Text style={styles.timeText}>{routeInfo.toTime}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.scanButton}
          onPress={() => navigation.navigate('ScanTicket')}
        >
          <Text style={styles.scanButtonText}>Scan passenger ticket</Text>
          <Ionicons name="scan-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.activityTitle}>TODAY'S ACTIVITY</Text>

        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[styles.statCard, styles.statCardActive]}
            onPress={() => navigation.navigate('TicketHistory', { type: 'valid' })}
          >
            <Text style={[styles.statValue, { color: '#0f766e' }]}>{stats.valid}</Text>
            <Text style={[styles.statLabel, { color: '#0f766e' }]}>Validated tickets</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard}
            onPress={() => navigation.navigate('TicketHistory', { type: 'all' })}
          >
            <Text style={styles.statValue}>{stats.remaining}</Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.footerText}>Route • {routeInfo.from} → {routeInfo.to}</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  badgeContainer: { marginBottom: 8 },
  dutyBadge: { backgroundColor: '#d1fae5', color: '#059669', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 24 },
  journeyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  journeyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  busBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  busBadgeText: { color: '#059669', fontSize: 12, fontWeight: '800' },
  serviceText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dotTeal: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#0f766e', marginRight: 12 },
  dotOrange: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316', marginRight: 12 },
  locationText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  timeText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  scanButton: { backgroundColor: '#0f766e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 12, marginBottom: 32, shadowColor: '#0f766e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  scanButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activityTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 16 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginHorizontal: 4 },
  statCardActive: { backgroundColor: '#ecfdf5', borderColor: '#ccfbf1' },
  statValue: { fontSize: 36, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  statLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  footerText: { fontSize: 13, color: '#94a3b8', marginTop: 8, marginLeft: 4 }
});
