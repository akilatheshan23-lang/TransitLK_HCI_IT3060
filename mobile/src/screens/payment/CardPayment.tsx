import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentStackParamList } from '../../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
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

  const isFormValid = cardNumber.trim().length > 0 && 
                      expiry.trim().length > 0 && 
                      cvv.trim().length > 0 && 
                      cardName.trim().length > 0;

  useEffect(() => {
    const loadTicketData = async () => {
      try {
        const stored = await AsyncStorage.getItem('@pending_ticket');
        if (stored) {
          const parsed = JSON.parse(stored);
          setTotalFare(parsed.totalFare || parsed.price || 0);
        }
      } catch (e) {}
    };
    loadTicketData();
  }, []);

  const handlePayment = async () => {
    setIsLoading(true);
    
    // Simulate PaymentFailed screen on entering '0000'
    if (cardNumber === '0000') {
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('PaymentFailed');
      }, 1000);
      return;
    }

    // Pure mock for Presentation (No backend hit to avoid ERR_CONNECTION_REFUSED)
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate('TicketSummary');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Card payment" />
      
      <View style={styles.content}>
        <View style={styles.cardPreview}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardPreviewLogo}>TRANSITLK SECURE PAY</Text>
            <View style={styles.nfcIcon} />
          </View>
          <Text style={styles.cardPreviewNumber}>••••  ••••  ••••  3456</Text>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>CARDHOLDER</Text>
              <Text style={styles.cardPreviewName}>KAMAL PERERA</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardPreviewName}>12/28</Text>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Card number</Text>
        <TextInput 
          style={styles.input} 
          placeholder="1234 5678 9012 3456" 
          keyboardType="numeric" 
          value={cardNumber}
          onChangeText={setCardNumber}
        />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { marginRight: 12 }]}>
            <Text style={styles.label}>Expiry date</Text>
            <TextInput 
              style={styles.input} 
              placeholder="MM/YY" 
              value={expiry}
              onChangeText={setExpiry}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CVV</Text>
            <TextInput 
              style={styles.input} 
              placeholder="•••" 
              secureTextEntry 
              keyboardType="numeric" 
              value={cvv}
              onChangeText={setCvv}
            />
          </View>
        </View>

        <Text style={styles.label}>Name on card</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Kamal Perera" 
          value={cardName}
          onChangeText={setCardName}
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
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  cardPreviewLogo: { color: '#94a3b8', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  nfcIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#334155' },
  cardPreviewNumber: { color: '#f8fafc', fontSize: 24, letterSpacing: 4, marginBottom: 24, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLabel: { color: '#64748b', fontSize: 10, marginBottom: 4, letterSpacing: 1 },
  cardPreviewName: { color: '#f1f5f9', fontSize: 14, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 1 },
  label: { fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 16, marginBottom: 16, color: '#1e293b' },
  row: { flexDirection: 'row' },
  inputGroup: { flex: 1 },
  footer: { marginTop: 'auto', paddingTop: 20 },
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center', shadowColor: '#0f766e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  buttonDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }
});
