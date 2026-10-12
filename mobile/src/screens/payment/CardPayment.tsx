import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PaymentStackParamList } from '../../navigation/navigationTypes';
import { platformShadow } from '../../theme/shadows';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import Header from '../../components/Header';
import { api, SavedCard } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<PaymentStackParamList, 'CardPayment'>;

export default function CardPayment() {
  const navigation = useNavigation<NavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [totalFare, setTotalFare] = useState<number>(0);
  const [isTopUpMode, setIsTopUpMode] = useState(false);
  const [cardType, setCardType] = useState('visa');
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [idempotencyKey] = useState(() => 'card_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9));

  const isFormValid = cardNumber.trim().length > 14 &&
                      expiry.trim().length === 5 &&
                      cvv.trim().length >= 3 &&
                      cardName.trim().length > 0;

  useEffect(() => {
    const loadData = async () => {
      try {
        const topupStr = await AsyncStorage.getItem('@pending_topup');
        if (topupStr) {
          setIsTopUpMode(true);
          const amt = parseFloat(topupStr);
          setTotalFare(isNaN(amt) || amt <= 0 ? 500 : amt);
          return;
        }

        const stored = await AsyncStorage.getItem('@pending_ticket');
        if (stored) {
          const parsed = JSON.parse(stored);
          setTotalFare(parsed.totalFare || parsed.price || 480);
        } else {
          setTotalFare(480);
        }
      } catch (e) {
        setTotalFare(480);
      }
    };
    loadData();
    loadSavedCards();
  }, []);

  const loadSavedCards = async () => {
    try {
      const res = await api.getSavedCards();
      if (res && res.data && res.data.length > 0) {
        setSavedCards(res.data);
        const defaultCard = res.data.find((c) => c.isDefault) || res.data[0];
        if (defaultCard) {
          applySavedCard(defaultCard);
          return;
        }
      }
    } catch (e) {}

    // Auto-prefill demo card so the user can test payment immediately with 1 tap
    setCardNumber('4532 8901 2345 6789');
    setCardName('KAMAL PERERA');
    setExpiry('12/28');
    setCardType('visa');
    setCvv('892');
  };

  const applySavedCard = (card: SavedCard) => {
    setSelectedCardId(card.id || card._id || null);
    setCardNumber(card.cardNumberMasked);
    setCardName(card.cardholderName);
    setExpiry(card.expiry);
    setCardType(card.cardType || 'visa');
    setCvv('•••');
  };

  const handleCardNumberChange = (text: string) => {
    const numericText = text.replace(/\D/g, '');

    // Format based on manually selected card type
    let formattedText = numericText;
    if (cardType === 'amex') {
      const match = numericText.match(/^(\d{0,4})(\d{0,6})(\d{0,5})$/);
      if (match) {
        formattedText = !match[2] ? match[1] : `${match[1]} ${match[2]}${match[3] ? ` ${match[3]}` : ''}`;
      }
    } else {
      formattedText = numericText.match(/.{1,4}/g)?.join(' ') || '';
    }

    setCardNumber(formattedText.substring(0, 19));
  };

  const handleExpiryChange = (text: string) => {
    const numericText = text.replace(/\D/g, '');
    let formattedText = numericText;
    if (numericText.length >= 2) {
      formattedText = `${numericText.substring(0, 2)}/${numericText.substring(2, 4)}`;
    }
    setExpiry(formattedText.substring(0, 5));
  };

  const handleCvvChange = (text: string) => {
    const numericText = text.replace(/\D/g, '');
    setCvv(numericText.substring(0, cardType === 'amex' ? 4 : 3));
  };

  const handlePayment = async () => {
    if (isLoading) return; // Prevent duplicate payment taps
    setIsLoading(true);

    if (cardNumber.replace(/\s/g, '') === '0000000000000000' || cardNumber === '0000') {
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('PaymentFailed');
      }, 800);
      return;
    }

    try {
      if (isTopUpMode) {
        const balanceStr = await AsyncStorage.getItem('@wallet_balance');
        const currentBalance = balanceStr ? parseFloat(balanceStr) : 1250.00;
        const topupAmt = totalFare > 0 ? totalFare : 500;
        const newBalance = currentBalance + topupAmt;
        await AsyncStorage.setItem('@wallet_balance', newBalance.toString());
        await AsyncStorage.removeItem('@pending_topup');
        setIsLoading(false);
        if (Platform.OS === 'web') {
          window.alert(`Wallet Top-up Successful!\nRs. ${topupAmt.toFixed(2)} added.\nNew Balance: Rs. ${newBalance.toFixed(2)}`);
        } else {
          Alert.alert(
            'Top-up Successful',
            `Rs. ${topupAmt.toFixed(2)} has been added to your TransitLK Wallet. New balance: Rs. ${newBalance.toFixed(2)}`
          );
        }
        navigation.navigate('EWalletPayment');
        return;
      }

      const stored = await AsyncStorage.getItem('@pending_ticket');
      const pendingTicket = stored ? JSON.parse(stored) : {};

      const fareAmount = totalFare > 0 ? totalFare : (pendingTicket.totalFare || pendingTicket.price || 480);
      const cleanLast4 = cardNumber.replace(/\D/g, '').slice(-4) || '6789';

      let serverTicket: any = null;
      let qrCodeData = `TRANSITLK-TICKET:${Date.now()}`;

      try {
        const res = await api.processPayment({
          idempotencyKey,
          amount: fareAmount,
          method: 'card',
          details: {
            cardType,
            last4: cleanLast4,
            cardholderName: cardName.trim() || 'KAMAL PERERA',
          },
          routeData: {
            bus: pendingTicket.bus || 'BUS 125',
            type: pendingTicket.type || 'Standard service',
            from: pendingTicket.from || 'Horana',
            to: pendingTicket.to || 'Colombo Fort',
            fromTime: pendingTicket.fromTime || '08:30 AM',
            date: pendingTicket.date || new Date().toLocaleDateString('en-GB'),
          },
          ticketCount: pendingTicket.ticketCount || 1,
        });

        if (res && res.success && res.ticket) {
          serverTicket = {
            id: res.ticket.ticketId,
            ticketId: res.ticket.ticketId,
            verificationCode: res.ticket.verificationCode,
            from: res.ticket.route.from,
            to: res.ticket.route.to,
            date: res.ticket.route.date,
            time: res.ticket.route.departureTime,
            price: `Rs. ${res.ticket.amount.toFixed(2)}`,
            ticketCount: res.ticket.numberOfTickets || 1,
            bus: res.ticket.route.bus,
            savedAt: new Date().toLocaleDateString('en-GB'),
            qrData: res.qrData,
            isDemo: true,
            status: 'valid',
          };
          qrCodeData = res.qrData;
        }
      } catch (e) {
        // Fallback to local demo ticket on backend error
      }

      if (!serverTicket) {
        serverTicket = {
          id: 'TIK-' + Date.now().toString().slice(-6),
          ticketId: 'TIK-' + Date.now().toString().slice(-6),
          verificationCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          from: pendingTicket.from || 'Horana',
          to: pendingTicket.to || 'Colombo Fort',
          date: pendingTicket.date || new Date().toLocaleDateString('en-GB'),
          time: pendingTicket.fromTime || '08:30 AM',
          price: `Rs. ${fareAmount.toFixed(2)}`,
          ticketCount: pendingTicket.ticketCount || 1,
          bus: pendingTicket.bus || 'BUS 125',
          savedAt: new Date().toLocaleDateString('en-GB'),
          qrData: qrCodeData,
          isDemo: true,
          status: 'valid',
        };
      }

      await AsyncStorage.setItem('@current_ticket', JSON.stringify(serverTicket));

      // Save to offline wallet list
      try {
        const offlineStr = await AsyncStorage.getItem('@offline_tickets');
        const offlineTickets = offlineStr ? JSON.parse(offlineStr) : [];
        await AsyncStorage.setItem('@offline_tickets', JSON.stringify([serverTicket, ...offlineTickets]));
      } catch (e) {}

      setIsLoading(false);
      navigation.navigate('TicketSummary');
    } catch (err: any) {
      setIsLoading(false);
      navigation.navigate('TicketSummary');
    }
  };

  const getCardIcon = (type = cardType) => {
    switch (type) {
      case 'visa': return 'cc-visa';
      case 'mastercard': return 'cc-mastercard';
      case 'amex': return 'cc-amex';
      case 'discover': return 'cc-discover';
      default: return 'credit-card';
    }
  };

  const getCardTheme = (type = cardType) => {
    switch (type.toLowerCase()) {
      case 'visa':
        return {
          bg: '#1d4ed8', // Royal Blue
          accent: '#93c5fd',
          label: '#bfdbfe',
          text: '#ffffff',
          brandColor: '#ffffff',
          shadowColor: '#1e40af',
          chipColor: '#facc15',
          chipBorder: '#ca8a04',
          subPattern: 'rgba(255, 255, 255, 0.15)',
          buttonColor: '#1d4ed8',
          buttonBg: '#eff6ff',
        };
      case 'mastercard':
        return {
          bg: '#b91c1c', // Rich Crimson Ruby Red (No more black!)
          accent: '#fed7aa',
          label: '#fecaca',
          text: '#ffffff',
          brandColor: '#ffffff',
          shadowColor: '#991b1b',
          chipColor: '#fde047',
          chipBorder: '#d97706',
          subPattern: 'rgba(251, 146, 60, 0.2)',
          buttonColor: '#b91c1c',
          buttonBg: '#fef2f2',
        };
      case 'amex':
        return {
          bg: '#047857', // Deep Emerald Jade
          accent: '#6ee7b7',
          label: '#a7f3d0',
          text: '#ffffff',
          brandColor: '#6ee7b7',
          shadowColor: '#064e3b',
          chipColor: '#e2e8f0',
          chipBorder: '#94a3b8',
          subPattern: 'rgba(52, 211, 153, 0.18)',
          buttonColor: '#047857',
          buttonBg: '#ecfdf5',
        };
      case 'discover':
        return {
          bg: '#c2410c', // Warm Terracotta / Sunset Bronze
          accent: '#fde047',
          label: '#fed7aa',
          text: '#ffffff',
          brandColor: '#ffedd5',
          shadowColor: '#9a3412',
          chipColor: '#fef08a',
          chipBorder: '#eab308',
          subPattern: 'rgba(251, 146, 60, 0.2)',
          buttonColor: '#c2410c',
          buttonBg: '#fff7ed',
        };
      default:
        return {
          bg: '#0f766e',
          accent: '#5eead4',
          label: '#99f6e4',
          text: '#ffffff',
          brandColor: '#ffffff',
          shadowColor: '#115e59',
          chipColor: '#facc15',
          chipBorder: '#ca8a04',
          subPattern: 'rgba(20, 184, 166, 0.18)',
          buttonColor: '#0f766e',
          buttonBg: '#f0fdfa',
        };
    }
  };

  const getCardLogoText = () => {
    switch (cardType.toLowerCase()) {
      case 'visa': return 'VISA';
      case 'mastercard': return 'MASTERCARD';
      case 'amex': return 'AMERICAN EXPRESS';
      case 'discover': return 'DISCOVER';
      default: return 'TRANSITLK PAY';
    }
  };

  const currentTheme = getCardTheme();
  const displayCardNumber = cardNumber || '••••  ••••  ••••  3456';
  const displayCardName = cardName || 'KAMAL PERERA';
  const displayExpiry = expiry || '12/28';

  const cardTypes = ['visa', 'mastercard', 'amex', 'discover'];

  return (
    <SafeAreaView style={styles.container}>
      <Header title={isTopUpMode ? "Wallet top-up" : "Card payment"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick Select Saved Cards Section */}
        {savedCards.length > 0 && (
          <View style={styles.quickSelectContainer}>
            <View style={styles.quickSelectHeader}>
              <Text style={styles.quickSelectTitle}>QUICK SELECT SAVED CARD</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ManageCards')} activeOpacity={0.7}>
                <Text style={styles.manageCardsLinkText}>Manage</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedCardsScroll}>
              {savedCards.map((sc) => {
                const isSelected = (sc.id || sc._id) === selectedCardId;
                return (
                  <TouchableOpacity
                    key={sc.id || sc._id}
                    style={[styles.savedCardChip, isSelected && styles.savedCardChipActive]}
                    onPress={() => applySavedCard(sc)}
                    activeOpacity={0.8}
                  >
                    <FontAwesome name={getCardIcon(sc.cardType) as any} size={18} color={isSelected ? '#0f766e' : '#64748b'} />
                    <Text style={[styles.savedCardChipText, isSelected && styles.savedCardChipTextActive]}>
                      {sc.last4 ? `•••• ${sc.last4}` : sc.cardNumberMasked}
                    </Text>
                    {sc.isDefault && (
                      <View style={styles.chipStar}>
                        <Ionicons name="star" size={10} color="#0f766e" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Dynamic High-End Colorful Card Preview */}
        <View style={[styles.cardPreview, { backgroundColor: currentTheme.bg }]}>
          {/* Decorative geometric backdrop */}
          <View style={[styles.cardCircleBg, { backgroundColor: currentTheme.subPattern }]} />
          <View style={[styles.cardCircleBgSmall, { borderColor: currentTheme.subPattern }]} />

          {/* Card Top: TransitLK Badge & Card Brand */}
          <View style={styles.cardHeader}>
            <View style={styles.brandBadge}>
              <Ionicons name="bus" size={14} color={currentTheme.accent} style={{ marginRight: 6 }} />
              <Text style={[styles.brandText, { color: currentTheme.accent }]}>TransitLK</Text>
              <View style={[styles.cardTag, { backgroundColor: currentTheme.subPattern }]}>
                <Text style={[styles.cardTagText, { color: currentTheme.accent }]}>SECURE</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome name={getCardIcon()} size={24} color={currentTheme.brandColor} style={{ marginRight: 6 }} />
              <Text style={[styles.cardPreviewLogo, { color: currentTheme.brandColor }]}>{getCardLogoText()}</Text>
            </View>
          </View>

          {/* EMV Chip & Contactless Radio Wave */}
          <View style={styles.chipRow}>
            <View style={[styles.emvChip, { backgroundColor: currentTheme.chipColor, borderColor: currentTheme.chipBorder }]}>
              <View style={styles.chipLineHorizontal} />
              <View style={styles.chipLineVertical} />
              <View style={styles.chipCenter} />
            </View>
            <Ionicons name="radio" size={20} color="rgba(255,255,255,0.75)" style={styles.contactlessWave} />
          </View>

          {/* Embossed Card Number */}
          <Text style={[styles.cardPreviewNumber, { color: currentTheme.text }]}>{displayCardNumber}</Text>

          {/* Footer: Cardholder Name & Expiry Date */}
          <View style={styles.cardFooter}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.cardLabel, { color: currentTheme.label }]}>CARDHOLDER</Text>
              <Text style={[styles.cardPreviewName, { color: currentTheme.text }]} numberOfLines={1}>
                {displayCardName.toUpperCase()}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cardLabel, { color: currentTheme.label }]}>VALID THRU</Text>
              <Text style={[styles.cardPreviewExpiry, { color: currentTheme.text }]}>{displayExpiry}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Select Card Type</Text>
        <View style={styles.typeSelector}>
          {cardTypes.map(type => {
            const isSelected = cardType === type;
            const typeTheme = getCardTheme(type);
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  isSelected && {
                    borderColor: typeTheme.buttonColor,
                    backgroundColor: typeTheme.buttonBg,
                  },
                ]}
                onPress={() => {
                  setCardType(type);
                  // Reformat card number if they switch types
                  const numericText = cardNumber.replace(/\D/g, '');
                  let formattedText = numericText;
                  if (type === 'amex') {
                    const match = numericText.match(/^(\d{0,4})(\d{0,6})(\d{0,5})$/);
                    if (match) {
                      formattedText = !match[2] ? match[1] : `${match[1]} ${match[2]}${match[3] ? ` ${match[3]}` : ''}`;
                    }
                  } else {
                    formattedText = numericText.match(/.{1,4}/g)?.join(' ') || '';
                  }
                  setCardNumber(formattedText.substring(0, 19));
                }}
              >
                <FontAwesome
                  name={getCardIcon(type)}
                  size={32}
                  color={isSelected ? typeTheme.buttonColor : '#94a3b8'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Card number</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
            placeholder="1234 5678 9012 3456"
            keyboardType="numeric"
            value={cardNumber}
            onChangeText={handleCardNumberChange}
          />
          <FontAwesome name={getCardIcon()} size={24} color={'#0f766e'} style={{ marginRight: 16 }} />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { marginRight: 12 }]}>
            <Text style={styles.label}>Expiry date</Text>
            <TextInput
              style={styles.input}
              placeholder="MM/YY"
              keyboardType="numeric"
              value={expiry}
              onChangeText={handleExpiryChange}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={styles.input}
              placeholder={cardType === 'amex' ? "••••" : "•••"}
              secureTextEntry
              keyboardType="numeric"
              value={cvv}
              onChangeText={handleCvvChange}
            />
          </View>
        </View>

        <Text style={styles.label}>Name on card</Text>
        <TextInput
          style={styles.input}
          placeholder="Kamal Perera"
          value={cardName}
          onChangeText={setCardName}
          autoCapitalize="words"
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, (!isFormValid || isLoading) && styles.buttonDisabled]}
            onPress={handlePayment}
            disabled={isLoading || !isFormValid}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {!isFormValid
                    ? 'Fill all card details'
                    : (isTopUpMode
                        ? `Top-up Rs. ${(totalFare || 500).toFixed(2)}`
                        : `Pay Rs. ${(totalFare || 480).toFixed(2)}`)}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },
  cardPreview: {
    padding: 22,
    borderRadius: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...platformShadow({ color: '#000', width: 0, height: 10, opacity: 0.25, radius: 16, elevation: 8 }),
  },
  cardCircleBg: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  cardCircleBgSmall: {
    position: 'absolute',
    right: 40,
    bottom: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  brandBadge: { flexDirection: 'row', alignItems: 'center' },
  brandText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  cardTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  cardTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardPreviewLogo: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  emvChip: {
    width: 44,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLineHorizontal: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  chipLineVertical: { position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  chipCenter: { width: 16, height: 12, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' },
  contactlessWave: { marginLeft: 14, transform: [{ rotate: '90deg' }] },
  cardPreviewNumber: { fontSize: 20, fontWeight: '700', letterSpacing: 3, marginBottom: 20, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardLabel: { fontSize: 9, fontWeight: '700', marginBottom: 3, letterSpacing: 0.8 },
  cardPreviewName: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  cardPreviewExpiry: { fontSize: 14, fontWeight: '700', letterSpacing: 1 },
  label: { fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: '700' },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  typeButtonSelected: {
    borderColor: '#0f766e',
    backgroundColor: '#f0fdfa',
    borderWidth: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginBottom: 16,
  },
  input: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 16, marginBottom: 16, color: '#1e293b' },
  row: { flexDirection: 'row' },
  inputGroup: { flex: 1 },
  footer: { marginTop: 'auto', paddingTop: 20 },
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center', ...platformShadow({ color: '#0f766e', width: 0, height: 8, opacity: 0.3, radius: 16, elevation: 6 }) },
  buttonDisabled: { backgroundColor: '#94a3b8', ...Platform.select({ web: { boxShadow: 'none' } as any, default: { shadowOpacity: 0 } }) },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  quickSelectContainer: { marginBottom: 16 },
  quickSelectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  quickSelectTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  manageCardsLinkText: { fontSize: 12, fontWeight: '700', color: '#0f766e' },
  savedCardsScroll: { paddingVertical: 4 },
  savedCardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
  },
  savedCardChipActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  savedCardChipText: { fontSize: 13, fontWeight: '700', color: '#475569', marginLeft: 8 },
  savedCardChipTextActive: { color: '#0f766e' },
  chipStar: { marginLeft: 6, backgroundColor: '#ccfbf1', borderRadius: 8, padding: 2 },
});
