import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function RevenueDetails({ route }: any) {
  const [stats, setStats] = useState<any>({ invalid: 0 });
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  const ROUTES = Array.from({ length: 15 }).map((_, i) => {
    const isOdd = (i + 1) % 2 !== 0;
    return {
      id: `trip_${i + 1}`,
      name: `Trip ${i + 1}: ${isOdd ? 'Horana → Colombo' : 'Colombo → Horana'}`,
    };
  });

  useFocusEffect(
    useCallback(() => {
      const loadStats = async () => {
        try {
          const statsJson = await AsyncStorage.getItem('@conductor_stats_v3');
          if (statsJson) {
            setStats(JSON.parse(statsJson));
          }
        } catch (e) {}
      };
      loadStats();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Trip Metrics Breakdown" />
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Select a Trip to view metrics</Text>
        </View>

        {ROUTES.map((trip) => {
          const isExpanded = expandedTrip === trip.id;
          // Because we use stringified JSON for activeTrip in Dashboard, the key in stats is actually the stringified JSON
          // Let's find the matching key in stats.
          const statKey = Object.keys(stats).find(k => k.includes(trip.id));
          const tripStats = statKey ? stats[statKey] : { valid: 0, revenue: 0 };
          const valid = tripStats.valid || 0;
          const revenue = tripStats.revenue || 0;

          return (
            <View key={trip.id} style={styles.tripCard}>
              <TouchableOpacity 
                style={styles.tripHeader} 
                onPress={() => setExpandedTrip(isExpanded ? null : trip.id)}
              >
                <View style={styles.tripTitleRow}>
                  <Ionicons name="bus" size={24} color={isExpanded ? '#2563eb' : '#0f766e'} />
                  <Text style={[styles.tripTitle, isExpanded && { color: '#2563eb' }]}>{trip.name}</Text>
                </View>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color="#64748b" />
              </TouchableOpacity>
              
              {isExpanded && (
                <View style={styles.expandedContent}>
                  <View style={styles.divider} />
                  
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Valid Tickets</Text>
                    <Text style={[styles.calcValue, { color: '#059669' }]}>{valid}</Text>
                  </View>

                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Gross Revenue</Text>
                    <Text style={[styles.calcValue, { color: '#2563eb', fontSize: 18 }]}>
                      Rs. {revenue.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  summaryCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  summaryTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  tripCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  tripTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tripTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  expandedContent: { paddingHorizontal: 20, paddingBottom: 20 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calcLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  calcValue: { fontSize: 16, color: '#0f172a', fontWeight: '800' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12, marginTop: 0 }
});
