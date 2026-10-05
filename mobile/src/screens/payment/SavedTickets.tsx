import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

interface SavedTicket {
  id?: string;
  ticketId: string;
  from: string;
  to: string;
  date: string;
  time: string;
  fare: string;
  savedAt: string;
}

export default function SavedTickets() {
  const [tickets, setTickets] = useState<SavedTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'offline' | 'all'>('offline');
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const saved = await AsyncStorage.getItem('@offline_tickets');
      if (saved !== null) {
        setTickets(JSON.parse(saved));
      } else {
        // Mock data matching Figma if empty
        setTickets([
          { ticketId: 'TKT001', from: 'Horana', to: 'Colombo', date: '12 Sep 2026', time: '08:30 AM', fare: 'Rs. 250', savedAt: '' },
          { ticketId: 'TKT002', from: 'Colombo', to: 'Horana', date: '13 Sep 2026', time: '05:30 PM', fare: 'Rs. 250', savedAt: '' }
        ]);
      }
    } catch (e) {
      console.error('Failed to load tickets', e);
    }
  };

  const renderTicket = ({ item }: { item: any }) => (
    <View style={styles.ticketCard}>
      <View style={styles.cardHeader}>
        <Ionicons name="bus-outline" size={18} color="#0f766e" />
        <Text style={styles.routeText}>{item.from} → {item.to}</Text>
      </View>
      
      <Text style={styles.dateText}>{item.date} • {item.time}</Text>
      
      <View style={styles.cardMiddle}>
        <Text style={styles.ticketId}>{item.id || item.ticketId}</Text>
        <Text style={styles.fare}>{item.price || item.fare}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.paidBadge}>
          <Text style={styles.paidText}>PAID</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('MyETicket', { ticketId: item.id || item.ticketId })}>
          <Text style={styles.viewTicket}>View ticket</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Saved tickets" />

      <FlatList
        data={tickets}
        keyExtractor={(item, index) => (item.id || item.ticketId || '') + index.toString()}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Your ticket wallet</Text>
            <Text style={styles.subtitle}>Ready when you are. Even offline.</Text>
            
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'offline' && styles.activeTab]}
                onPress={() => setActiveTab('offline')}
              >
                <Text style={[styles.tabText, activeTab === 'offline' && styles.activeTabText]}>Offline tickets</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All tickets</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={renderTicket}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No saved tickets</Text>
            <Text style={styles.emptyText}>Tickets you purchase will appear here for offline access.</Text>
          </View>
        }
      />

      {/* Mock Bottom Navigation Bar per Figma */}
      <View style={styles.bottomNav}>
        <View style={styles.navItem}>
          <Ionicons name="home-outline" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Home</Text>
        </View>
        <View style={styles.navItem}>
          <View style={styles.activeNavIcon}>
            <Ionicons name="ticket" size={24} color="#0f766e" />
          </View>
          <Text style={styles.activeNavText}>Tickets</Text>
        </View>
        <View style={styles.navItem}>
          <Ionicons name="chatbubbles-outline" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Community</Text>
        </View>
        <View style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#94a3b8" />
          <Text style={styles.navText}>Profile</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 100, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 100 },
  activeTab: { backgroundColor: '#0f766e', shadowColor: '#0f766e', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#fff' },
  ticketCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  routeText: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginLeft: 8 },
  dateText: { fontSize: 13, color: '#64748b', marginBottom: 20, marginLeft: 26 },
  cardMiddle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  ticketId: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  fare: { fontSize: 16, color: '#0f172a', fontWeight: '800' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  paidBadge: { backgroundColor: '#ccfbf1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  paidText: { color: '#0f766e', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  viewTicket: { color: '#0f766e', fontSize: 14, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', paddingHorizontal: 32 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', position: 'absolute', bottom: 0, left: 0, right: 0 },
  navItem: { alignItems: 'center', flex: 1 },
  navText: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 4 },
  activeNavIcon: { backgroundColor: '#ecfdf5', paddingHorizontal: 20, paddingVertical: 4, borderRadius: 16 },
  activeNavText: { fontSize: 10, color: '#0f766e', fontWeight: '700', marginTop: 4 }
});
