import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { platformShadow } from '../../theme/shadows';

type ValidationStatusType = 'VALID' | 'ALREADY_REDEEMED' | 'INVALID_FORGED' | 'OFFLINE_PENDING' | 'UNAUTHORIZED';

export default function ValidationResult() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const ticketData = route.params?.ticketData || 'Unknown';

  const [validationStatus, setValidationStatus] = useState<ValidationStatusType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState(true);

  const now = new Date();
  const [ticketDetails, setTicketDetails] = useState({
    ticketId: typeof ticketData === 'string' ? ticketData : 'TKT-UNKNOWN',
    fromLoc: 'Horana',
    toLoc: 'Colombo',
    dateStr: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    timeStr: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    priceStr: 'Rs. 250',
    numberOfTickets: 1,
    fare: 250,
  });

  useEffect(() => {
    const validateTicket = async () => {
      try {
        let finalDetails = { ...ticketDetails };
        let parsedTicketId: string | undefined;
        let parsedCode: string | undefined;

        try {
          const trimmedTicketData = String(ticketData).trim();
          if (trimmedTicketData.startsWith('{')) {
            const parsed = JSON.parse(trimmedTicketData);
            if (typeof parsed === 'object' && parsed !== null) {
              parsedTicketId = parsed.ticketId || parsed.id;
              parsedCode = parsed.verificationCode;
              if (parsedTicketId) finalDetails.ticketId = parsedTicketId;
              if (parsed.from) finalDetails.fromLoc = parsed.from;
              if (parsed.to) finalDetails.toLoc = parsed.to;
              if (parsed.date) finalDetails.dateStr = parsed.date;
              if (parsed.time) finalDetails.timeStr = parsed.time;
              if (parsed.amount || parsed.price) finalDetails.priceStr = `Rs. ${parsed.amount || parsed.price}`;
              if (parsed.numberOfTickets) finalDetails.numberOfTickets = parsed.numberOfTickets;
            }
          } else {
            // Raw string (Manual code entry or simple string scan)
            parsedTicketId = trimmedTicketData;
            finalDetails.ticketId = trimmedTicketData;
          }
        } catch {
          parsedTicketId = String(ticketData).trim();
          finalDetails.ticketId = parsedTicketId;
        }

        setTicketDetails(finalDetails);

        // Fetch conductor session token for verification
        const token = (await AsyncStorage.getItem('@transitlk_auth_token')) || 'mock-conductor-token';

        // Perform server-side authoritative verification
        const verifyRes = await api.verifyTicket(
          {
            qrData: typeof ticketData === 'string' ? ticketData : JSON.stringify(ticketData),
            ticketId: parsedTicketId,
            verificationCode: parsedCode,
          },
          token
        );

        if (verifyRes && verifyRes.valid === true) {
          // 1. Authoritative VALID & REDEEMED
          setValidationStatus('VALID');
          setStatusMessage(verifyRes.message || 'Ticket validated and redeemed successfully');

          if (verifyRes.ticket?.route) {
            const r = verifyRes.ticket.route;
            finalDetails.fromLoc = r.from || finalDetails.fromLoc;
            finalDetails.toLoc = r.to || finalDetails.toLoc;
            finalDetails.dateStr = r.date || finalDetails.dateStr;
            finalDetails.timeStr = r.departureTime || finalDetails.timeStr;
            if (verifyRes.ticket.amount) {
              finalDetails.fare = verifyRes.ticket.amount;
              finalDetails.priceStr = `Rs. ${verifyRes.ticket.amount}`;
            }
            if (verifyRes.ticket.numberOfTickets) {
              finalDetails.numberOfTickets = verifyRes.ticket.numberOfTickets;
            }
            setTicketDetails({ ...finalDetails });
          }

          // Update trip revenue stats
          const activeTrip = (await AsyncStorage.getItem('@active_trip_v3')) || 'trip1';
          const statsJson = await AsyncStorage.getItem('@conductor_stats_v3');
          let stats = statsJson ? JSON.parse(statsJson) : { trip1: { valid: 0, revenue: 0 }, trip2: { valid: 0, revenue: 0 }, invalid: 0 };
          if (!stats[activeTrip]) stats[activeTrip] = { valid: 0, revenue: 0, invalid: 0, invalidRevenue: 0 };

          stats[activeTrip].valid = (stats[activeTrip].valid || 0) + finalDetails.numberOfTickets;
          stats[activeTrip].revenue = (stats[activeTrip].revenue || 0) + finalDetails.fare;
          await AsyncStorage.setItem('@conductor_stats_v3', JSON.stringify(stats));

          // Log in scan history
          const historyJson = await AsyncStorage.getItem('@conductor_history_v3');
          const history = historyJson ? JSON.parse(historyJson) : [];
          history.unshift({
            ticketId: finalDetails.ticketId,
            isValid: true,
            status: 'redeemed',
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString(),
          });
          await AsyncStorage.setItem('@conductor_history_v3', JSON.stringify(history));

        } else if (verifyRes && (verifyRes.status === 'redeemed' || (verifyRes.message && verifyRes.message.includes('already')))) {
          // 2. DUPLICATE SCAN REJECTED
          setValidationStatus('ALREADY_REDEEMED');
          setStatusMessage(verifyRes.message || 'Duplicate scan rejected: Ticket has already been redeemed');

          const statsJson = await AsyncStorage.getItem('@conductor_stats_v3');
          if (statsJson) {
            const stats = JSON.parse(statsJson);
            stats.invalid = (stats.invalid || 0) + 1;
            await AsyncStorage.setItem('@conductor_stats_v3', JSON.stringify(stats));
          }
        } else if (verifyRes && (verifyRes.status === 'not_found' || (verifyRes.message && verifyRes.message.includes('not exist')))) {
          // 3. UNKNOWN / FORGED TICKET REJECTED
          setValidationStatus('INVALID_FORGED');
          setStatusMessage(verifyRes.message || 'Forged or unknown ticket: Ticket ID does not exist in TransitLK system');

          const statsJson = await AsyncStorage.getItem('@conductor_stats_v3');
          if (statsJson) {
            const stats = JSON.parse(statsJson);
            stats.invalid = (stats.invalid || 0) + 1;
            await AsyncStorage.setItem('@conductor_stats_v3', JSON.stringify(stats));
          }
        } else if (verifyRes && (verifyRes.status === 'Unauthorized' || verifyRes.message?.includes('denied') || verifyRes.message?.includes('token required'))) {
          // 4. UNAUTHORIZED CONDUCTOR
          setValidationStatus('UNAUTHORIZED');
          setStatusMessage(verifyRes.message || 'Conductor authorization token required');
        } else {
          // 5. OFFLINE / NETWORK UNREACHABLE
          // Per spec: "If offline, show UNVERIFIED / PENDING SYNC, never a trusted VALID result."
          // "Do not automatically redeem a pending offline scan without server confirmation."
          setValidationStatus('OFFLINE_PENDING');
          setStatusMessage('TransitLK backend server unreachable. Ticket unverified until online sync.');

          // Queue pending scan for later verification when online
          try {
            const pendingQueueStr = await AsyncStorage.getItem('@offline_pending_scans');
            const pendingQueue = pendingQueueStr ? JSON.parse(pendingQueueStr) : [];
            pendingQueue.push({
              ticketId: finalDetails.ticketId,
              scannedAt: new Date().toISOString(),
              rawTicketData: ticketData,
            });
            await AsyncStorage.setItem('@offline_pending_scans', JSON.stringify(pendingQueue));
          } catch {}
        }
      } catch (err: any) {
        setValidationStatus('OFFLINE_PENDING');
        setStatusMessage(err.message || 'Network error: Ticket unverified pending online sync');
      } finally {
        setIsChecking(false);
      }
    };
    validateTicket();
  }, [ticketData]);

  if (isChecking || validationStatus === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Ticket check" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0f766e" />
          <Text style={{ marginTop: 16, color: '#64748b' }}>Verifying with TransitLK server...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isValid = validationStatus === 'VALID';
  const isOffline = validationStatus === 'OFFLINE_PENDING';
  const isAlreadyRedeemed = validationStatus === 'ALREADY_REDEEMED';

  let iconName: any = 'checkmark-sharp';
  let iconColor = '#0f766e';
  let circleBg = '#ccfbf1';
  let titleText = 'Valid ticket';
  let subtitleText = 'Passenger is ready to board.';
  let noteText = '';

  if (validationStatus === 'VALID') {
    iconName = 'checkmark-sharp';
    iconColor = '#0f766e';
    circleBg = '#ccfbf1';
    titleText = 'Valid ticket';
    subtitleText = 'Server verification confirmed. Passenger is ready to board.';
  } else if (validationStatus === 'OFFLINE_PENDING') {
    iconName = 'cloud-offline-outline';
    iconColor = '#d97706';
    circleBg = '#fef3c7';
    titleText = 'UNVERIFIED / PENDING SYNC';
    subtitleText = 'Backend unreachable. Scan queued; not verified or redeemed.';
    noteText = 'Offline scan unverified. Requires server confirmation before passenger boarding.';
  } else if (validationStatus === 'ALREADY_REDEEMED') {
    iconName = 'close-sharp';
    iconColor = '#ef4444';
    circleBg = '#fee2e2';
    titleText = 'Already redeemed';
    subtitleText = 'Duplicate scan rejected: Ticket has already been redeemed.';
    noteText = statusMessage || 'This ticket was already scanned and used.';
  } else if (validationStatus === 'UNAUTHORIZED') {
    iconName = 'lock-closed-outline';
    iconColor = '#ef4444';
    circleBg = '#fee2e2';
    titleText = 'Unauthorized';
    subtitleText = statusMessage || 'Conductor authorization token required.';
    noteText = 'Sign in with an authorized conductor account to validate tickets.';
  } else {
    // INVALID_FORGED
    iconName = 'close-sharp';
    iconColor = '#ef4444';
    circleBg = '#fee2e2';
    titleText = 'Ticket not valid';
    subtitleText = 'Unknown or forged ticket. Not found in TransitLK system.';
    noteText = 'Check the date and ticket ID with the passenger.';
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={isValid ? 'Ticket validated' : (isOffline ? 'Unverified ticket' : 'Ticket check')} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: circleBg }]}>
          <Ionicons name={iconName} size={48} color={iconColor} />
        </View>

        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>

        <View style={styles.detailsCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Ticket ID</Text>
            <Text style={styles.value}>{ticketDetails.ticketId}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>From</Text>
            <Text style={styles.value}>{ticketDetails.fromLoc}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>To</Text>
            <Text style={styles.value}>{ticketDetails.toLoc}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{ticketDetails.dateStr}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <Text style={styles.value}>{ticketDetails.timeStr}</Text>
          </View>

          <View style={[styles.row, { marginTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 }]}>
            <Text style={styles.label}>Tickets Count</Text>
            <Text style={styles.value}>{ticketDetails.numberOfTickets}</Text>
          </View>

          <View style={[styles.row, { marginBottom: 0 }]}>
            <Text style={[styles.label, { color: '#0f172a', fontWeight: '700' }]}>Total Amount</Text>
            <Text style={styles.price}>{ticketDetails.priceStr}</Text>
          </View>

          {!isValid && (
            <Text style={[styles.invalidNote, isOffline && { color: '#d97706' }]}>
              {noteText}
            </Text>
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
  detailsCard: { backgroundColor: '#fff', width: '100%', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#e2e8f0', ...platformShadow({ color: '#000', width: 0, height: 2, opacity: 0.05, radius: 6, elevation: 2 }), marginBottom: 32 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  value: { fontSize: 14, color: '#0f172a', fontWeight: '700' },
  price: { fontSize: 18, color: '#0f766e', fontWeight: '800' },
  invalidNote: { marginTop: 16, fontSize: 13, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  footer: { width: '100%', marginTop: 'auto' },
  primaryButton: { backgroundColor: '#0f766e', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 12, marginBottom: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  secondaryButtonText: { color: '#64748b', fontSize: 15, fontWeight: '600' }
});
