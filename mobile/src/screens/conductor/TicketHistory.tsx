import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

export default function TicketHistory() {
  const route = useRoute<any>();
  const filterType = route.params?.type || 'all'; // 'valid' | 'invalid' | 'all'
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyJson = await AsyncStorage.getItem('@conductor_history_v3');
        if (historyJson) {
          const allData = JSON.parse(historyJson);
          if (filterType === 'all') {
            setHistory(allData.reverse());
          } else {
            const filtered = allData.filter((item: any) =>
              filterType === 'valid' ? item.isValid : !item.isValid
            );
            setHistory(filtered.reverse());
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadHistory();
  }, [filterType]);

  const clearHistory = async () => {
    await AsyncStorage.removeItem('@conductor_history_v3');
    // Also reset stats
    await AsyncStorage.setItem('@conductor_stats_v3', JSON.stringify({ trip1: { valid: 0, revenue: 0 }, trip2: { valid: 0, revenue: 0 }, invalid: 0 }));
    setHistory([]);
  };

  const getTitle = () => {
    if (filterType === 'valid') return 'Valid Tickets';
    if (filterType === 'invalid') return 'Invalid Tickets';
    return 'Scanned Tickets';
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={getTitle()} />

      <View style={styles.content}>
        {history.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No tickets found.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryText}>Total Tickets: {history.length}</Text>
              {filterType === 'valid' && (
                <Text style={styles.summaryTotal}>Revenue: Rs. {history.length * 250}</Text>
              )}
            </View>
            <FlatList
              data={history}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.historyCard}>
                <View style={[styles.iconBox, { backgroundColor: item.isValid ? '#d1fae5' : '#fee2e2' }]}>
                  <Ionicons name={item.isValid ? 'checkmark' : 'close'} size={24} color={item.isValid ? '#059669' : '#ef4444'} />
                </View>
                <View style={styles.details}>
                  <Text style={styles.ticketId}>{item.ticketId}</Text>
                  <Text style={styles.timestamp}>{item.time}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusText, { color: item.isValid ? '#059669' : '#ef4444' }]}>
                    {item.isValid ? 'VALID' : 'INVALID'}
                  </Text>
                </View>
              </View>
            )}
          />
          </>
        )}

        {history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearHistory}>
            <Text style={styles.clearButtonText}>Clear History</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, flex: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  summaryBanner: { backgroundColor: '#e0f2fe', padding: 16, borderRadius: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryText: { fontSize: 16, fontWeight: '700', color: '#0369a1' },
  summaryTotal: { fontSize: 16, fontWeight: '800', color: '#0284c7' },
  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  details: { flex: 1 },
  ticketId: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  timestamp: { fontSize: 13, color: '#64748b', marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 12, fontWeight: '800' },
  clearButton: { marginTop: 16, padding: 16, alignItems: 'center' },
  clearButtonText: { color: '#ef4444', fontWeight: 'bold' }
});
