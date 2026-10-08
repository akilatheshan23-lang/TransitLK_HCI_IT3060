import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentStackParamList } from '../../navigation/AppNavigator';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import Header from '../../components/Header';

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
          setTotalFare(parseFloat(topupStr));
          return;
        }

        const stored = await AsyncStorage.getItem('@pending_ticket');
        if (stored) {
          const parsed = JSON.parse(stored);
          setTotalFare(parsed.totalFare || parsed.price || 0);
        }
      } catch (e) {}
    };
    loadData();
  }, []);

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
    setIsLoading(true);

    if (cardNumber.replace(/\s/g, '') === '0000000000000000' || cardNumber === '0000') {
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('PaymentFailed');
      }, 1000);
      return;
    }

    setTimeout(async () => {
      setIsLoading(false);

      if (isTopUpMode) {
        try {
          const balanceStr = await AsyncStorage.getItem('@wallet_balance');
          const currentBalance = balanceStr ? parseFloat(balanceStr) : 1250.00;
          await AsyncStorage.setItem('@wallet_balance', (currentBalance + totalFare).toString());
          await AsyncStorage.removeItem('@pending_topup');

          navigation.navigate('EWalletPayment');
        } catch (e) {
          Alert.alert('Error', 'Something went wrong. Please try again.');
        }
      } else {
        navigation.navigate('TicketSummary');
      }
    }, 1500);
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

  const getCardLogoText = () => {
    switch (cardType) {
      case 'visa': return 'VISA';
      case 'mastercard': return 'MASTERCARD';
      case 'amex': return 'AMERICAN EXPRESS';
      case 'discover': return 'DISCOVER';
      default: return 'TRANSITLK SECURE PAY';
    }
  };

  const displayCardNumber = cardNumber || '••••  ••••  ••••  3456';
  const displayCardName = cardName || 'KAMAL PERERA';
  const displayExpiry = expiry || '12/28';

  const cardTypes = ['visa', 'mastercard', 'amex', 'discover'];

  return (
    <SafeAreaView style={styles.container}>
      <Header title={isTopUpMode ? "Wallet top-up" : "Card payment"} />

      <View style={styles.content}>
        <View style={styles.cardPreview}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <FontAwesome name={getCardIcon()} size={24} color="#94a3b8" style={{ marginRight: 8 }} />
              <Text style={styles.cardPreviewLogo}>{getCardLogoText()}</Text>
            </View>
            <View style={styles.nfcIcon} />
          </View>
          <Text style={styles.cardPreviewNumber}>{displayCardNumber}</Text>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>CARDHOLDER</Text>
              <Text style={styles.cardPreviewName}>{displayCardName.toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardPreviewName}>{displayExpiry}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Select Card Type</Text>
        <View style={styles.typeSelector}>
          {cardTypes.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, cardType === type && styles.typeButtonSelected]}
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
              <FontAwesome name={getCardIcon(type)} size={32} color={cardType === type ? '#0f766e' : '#94a3b8'} />
            </TouchableOpacity>
          ))}
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
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>{!isFormValid ? 'Fill all fields' : `Pay Rs. ${totalFare}`}</Text>
                <Ionicons name="lock-closed-outline" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, flex: 1 },
  cardPreview: {
    backgroundColor: '#0f172a',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32, alignItems: 'center' },
  cardPreviewLogo: { color: '#94a3b8', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  nfcIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#334155' },
  cardPreviewNumber: { color: '#f8fafc', fontSize: 24, letterSpacing: 4, marginBottom: 24, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { color: '#64748b', fontSize: 10, marginBottom: 4, letterSpacing: 1 },
  cardPreviewName: { color: '#f1f5f9', fontSize: 14, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 1 },
  label: { fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: '600' },
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
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#0f766e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }
});
