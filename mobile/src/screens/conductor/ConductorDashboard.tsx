// Force reload
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

export default function ConductorDashboard() {
  const navigation = useNavigation<any>();
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [stats, setStats] = useState<any>({ invalid: 0 });
  const [isRouteModalVisible, setRouteModalVisible] = useState(false);

  const ROUTES = Array.from({ length: 15 }).map((_, i) => {
    const isOdd = (i + 1) % 2 !== 0;
    return {
      id: `trip_${i + 1}`,
      name: `Trip ${i + 1}: ${isOdd ? 'Horana → Colombo' : 'Colombo → Horana'}`,
      from: isOdd ? 'Horana' : 'Colombo',
      to: isOdd ? 'Colombo' : 'Horana'
    };
  });

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        try {
          const tripJson = await AsyncStorage.getItem('@active_trip_v3');
          if (tripJson) setActiveTrip(JSON.parse(tripJson));

          const statsJson = await AsyncStorage.getItem('@conductor_stats_v3');
          if (statsJson) {
            const parsed = JSON.parse(statsJson);
            if (typeof parsed.valid === 'number' && !parsed.trip1) {
              setStats({
                trip1: { valid: parsed.valid, revenue: parsed.revenue || (parsed.valid * 250) },
                invalid: parsed.invalid || 0
              });
            } else {
              setStats(parsed);
            }
          }
        } catch (e) {}
      };
      loadData();
    }, [])
  );

  const selectRoute = async (route: any) => {
    setActiveTrip(route);
    await AsyncStorage.setItem('@active_trip_v3', JSON.stringify(route));
    setRouteModalVisible(false);
  };

  const handleAction = (actionType: string) => {
    if (!activeTrip) {
      alert('Please select a route first.');
      return;
    }
    if (actionType === 'scan') navigation.navigate('ScanTicket');
    else navigation.navigate('ManualCheck');
  };

  const resetMetrics = async () => {
    try {
      await AsyncStorage.removeItem('@conductor_stats_v3');
      await AsyncStorage.removeItem('@conductor_history_v3');
      await AsyncStorage.removeItem('@scanned_tickets_v3');
      setStats({ invalid: 0 });
      alert('All metrics have been reset to 0.');
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate totals from dynamic keys
  let totalValid = 0;
  let totalRevenue = 0;
  Object.keys(stats).forEach(key => {
    if (key !== 'invalid' && stats[key]) {
      totalValid += (stats[key].valid || 0);
      totalRevenue += (stats[key].revenue || 0);
    }
  });
  const invalidChecks = stats.invalid || 0;

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Conductor dashboard" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.badgeContainer}>
            <Text style={styles.dutyBadge}>ON DUTY</Text>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE SYNC</Text>
            </View>
          </View>
        </View>

        <Text style={styles.greeting}>Hello, Kamal</Text>
        <Text style={styles.subtitle}>Select the current trip before scanning.</Text>

        <TouchableOpacity
          style={styles.routeSelectorBtn}
          onPress={() => setRouteModalVisible(true)}
        >
          <View>
            <Text style={styles.routeSelectorLabel}>Current Active Route</Text>
            <Text style={styles.routeSelectorValue}>
              {activeTrip ? activeTrip.name : 'Tap to select a route...'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={24} color="#64748b" />
        </TouchableOpacity>

        {activeTrip && (
          <View style={styles.journeyCard}>
            <View style={styles.journeyHeader}>
              <View style={styles.busBadge}><Text style={styles.busBadgeText}>BUS 125</Text></View>
              <Text style={styles.serviceText}>Direct service</Text>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.dotTeal} />
              <Text style={styles.locationText}>{activeTrip.from}</Text>
            </View>

            <View style={styles.routeRow}>
              <View style={styles.dotOrange} />
              <Text style={styles.locationText}>{activeTrip.to}</Text>
            </View>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: activeTrip ? '#0f766e' : '#94a3b8', marginRight: 6 }]}
            onPress={() => handleAction('scan')}
          >
            <Ionicons name="scan-outline" size={24} color="#fff" />
            <Text style={styles.actionBtnText}>Scan QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: activeTrip ? '#334155' : '#94a3b8', marginLeft: 6 }]}
            onPress={() => handleAction('manual')}
          >
            <Ionicons name="keypad-outline" size={24} color="#fff" />
            <Text style={styles.actionBtnText}>Enter Code</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.activityTitle}>REAL-TIME ROUTE METRICS</Text>

        <View style={styles.statsGrid}>
          {/* Valid Tickets */}
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: '#ecfdf5', borderColor: '#ccfbf1' }]}
            onPress={() => navigation.navigate('RevenueDetails', { filter: 'valid' })}
          >
            <Text style={[styles.statValue, { color: '#059669' }]}>{totalValid}</Text>
            <Text style={[styles.statLabel, { color: '#059669' }]}>Valid Tickets</Text>
          </TouchableOpacity>

          {/* Invalid Tickets */}
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}
            onPress={() => navigation.navigate('RevenueDetails', { filter: 'invalid' })}
          >
            <Text style={[styles.statValue, { color: '#dc2626' }]}>{invalidChecks}</Text>
            <Text style={[styles.statLabel, { color: '#dc2626' }]}>Invalid Checks</Text>
          </TouchableOpacity>

          {/* Revenue */}
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: '#eff6ff', borderColor: '#dbeafe', width: '100%' }]}
            onPress={() => navigation.navigate('RevenueDetails', { filter: 'revenue' })}
          >
            <Text style={[styles.statValue, { color: '#2563eb', fontSize: 24, marginTop: 10 }]}>
              Rs.{totalRevenue.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: '#2563eb' }]}>Total Gross Revenue</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Metrics synced with TransitLK Backend.</Text>

        <TouchableOpacity style={styles.resetButton} onPress={resetMetrics}>
          <Text style={styles.resetButtonText}>Reset All Metrics</Text>
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>

      {/* Modal for Route Selection */}
      {isRouteModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Route</Text>
              <TouchableOpacity onPress={() => setRouteModalVisible(false)}>
                <Ionicons name="close" size={28} color="#0f172a" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.routeList}>
              {ROUTES.map((route) => (
                <TouchableOpacity
                  key={route.id}
                  style={styles.routeItem}
                  onPress={() => selectRoute(route)}
                >
                  <Ionicons name="bus-outline" size={20} color="#0f766e" />
                  <Text style={styles.routeItemText}>{route.name}</Text>
                  {activeTrip?.id === route.id && (
                    <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 },
  dutyBadge: { backgroundColor: '#d1fae5', color: '#059669', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#dc2626', marginRight: 4 },
  liveText: { fontSize: 9, color: '#dc2626', fontWeight: '800', letterSpacing: 1 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748b', marginBottom: 16 },
  tripSelector: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4, marginBottom: 20 },
  tripTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tripTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tripTabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  tripTabTextActive: { color: '#0f172a', fontWeight: '800' },
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
  actionButtons: { flexDirection: 'row', marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 8 },
  activityTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 1, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statBox: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  statValue: { fontSize: 36, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  footerText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
  resetButton: { marginTop: 16, padding: 12, backgroundColor: '#fee2e2', borderRadius: 8, alignItems: 'center' },
  resetButtonText: { color: '#ef4444', fontWeight: '700' },
  routeSelectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  routeSelectorLabel: { fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 },
  routeSelectorValue: { fontSize: 15, color: '#0f172a', fontWeight: '700' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  routeList: { marginBottom: 20 },
  routeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  routeItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#334155', marginLeft: 12 }
});
