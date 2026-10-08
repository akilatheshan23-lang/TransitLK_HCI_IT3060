import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';

export default function MyETicket() {
  const navigation = useNavigation<any>();
  const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const currentTicketStr = await AsyncStorage.getItem('@current_ticket');
        if (currentTicketStr) {
          setTicketData(JSON.parse(currentTicketStr));
        } else {
          const now = new Date();
          const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          // Fallback if accessed without flow
          setTicketData({
            id: 'TKT001', from: 'Horana', to: 'Colombo', date: formattedDate, time: formattedTime, price: 'Rs. 250', bus: 'BUS 125'
          });
        }
      } catch (e) {}
    };
    loadTicket();
  }, []);

  if (!ticketData) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="My E-Ticket" />
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
          <ActivityIndicator size="large" color="#0f766e" />
        </View>
      </SafeAreaView>
    );
  }

  // Inject isValid for ValidationResult to parse easily later
  const qrValue = JSON.stringify({ ...ticketData, isValid: true });

  return (
    <SafeAreaView style={styles.container}>
      <Header title="My E-Ticket" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.ticketContainer}>

          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>AVAILABLE OFFLINE</Text>
          </View>

          <View style={styles.qrSection}>
            <Text style={styles.scanText}>SCAN. HOP ON. GO.</Text>
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={qrValue}
                size={180}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.ticketIdText}>{ticketData.id}</Text>

            {ticketData.verificationCode ? (
              <View style={styles.verificationCodeBox}>
                <Text style={styles.verificationCodeLabel}>Verification Code</Text>
                <Text style={styles.verificationCodeText}>{ticketData.verificationCode}</Text>
              </View>
            ) : null}

            <Text style={styles.scanInstruction}>Show this QR or code to your conductor</Text>
          </View>

          <View style={styles.divider}>
            <View style={styles.notchLeft} />
            <Text style={styles.dashLine}>- - - - - - - - - - - - - - - - - - - -</Text>
            <View style={styles.notchRight} />
          </View>

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Route</Text>
              <Text style={styles.detailValue}>{ticketData.from} → {ticketData.to}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{ticketData.date}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Departure</Text>
              <Text style={styles.detailValue}>{ticketData.time}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fare</Text>
              <View style={styles.fareContainer}>
                <Text style={styles.detailValue}>{ticketData.price}</Text>
                <Text style={styles.bulletPoint}> • </Text>
                <Text style={styles.paidText}>PAID</Text>
              </View>
            </View>
          </View>

        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={() => navigation.navigate('SavedTickets')}
        >
          <Text style={styles.saveBtnText}>Save ticket</Text>
          <Ionicons name="download-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 20, flex: 1, alignItems: 'center' },
  ticketContainer: { backgroundColor: '#fff', borderRadius: 24, width: '100%', paddingVertical: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10, marginTop: 12 },
  offlineBadge: { backgroundColor: '#cffafe', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 24, marginBottom: 16 },
  offlineBadgeText: { color: '#0891b2', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  qrSection: { alignItems: 'center', paddingHorizontal: 24 },
  scanText: { color: '#0f766e', fontSize: 13, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  qrCodeWrapper: { padding: 16, backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  ticketIdText: { marginTop: 20, fontSize: 20, fontWeight: '800', color: '#0f172a' },
  verificationCodeBox: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  verificationCodeLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  verificationCodeText: { fontSize: 24, fontWeight: '800', color: '#0f766e', letterSpacing: 4 },
  scanInstruction: { marginTop: 12, fontSize: 13, color: '#64748b' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  notchLeft: { width: 16, height: 32, backgroundColor: '#f1f5f9', borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  notchRight: { width: 16, height: 32, backgroundColor: '#f1f5f9', borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  dashLine: { flex: 1, color: '#cbd5e1', letterSpacing: 3, textAlign: 'center' },
  detailsSection: { paddingHorizontal: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  fareContainer: { flexDirection: 'row', alignItems: 'center' },
  bulletPoint: { color: '#94a3b8', fontSize: 14, fontWeight: '700', marginHorizontal: 4 },
  paidText: { color: '#0f766e', fontSize: 14, fontWeight: '800' },
  saveBtn: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', width: '100%', padding: 20, borderRadius: 16, marginTop: 'auto', marginBottom: 20, alignItems: 'center', shadowColor: '#0f766e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }
});
