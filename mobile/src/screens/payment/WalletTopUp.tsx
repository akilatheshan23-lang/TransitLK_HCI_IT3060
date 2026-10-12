import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';

export default function WalletTopUp() {
  const navigation = useNavigation<any>();
  const [amount, setAmount] = useState('500');

  const handleTopUp = async () => {
    const topUpAmount = parseFloat(amount);
    if (isNaN(topUpAmount) || topUpAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to top up.');
      return;
    }

    try {
      await AsyncStorage.setItem('@pending_topup', topUpAmount.toString());
      navigation.navigate('CardPayment');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Top up wallet" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Add money</Text>
        <Text style={styles.subtitle}>Enter the amount you want to add to your TransitLK Wallet.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.currencySymbol}>Rs.</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View style={styles.quickAmounts}>
          {[500, 1000, 2000, 5000].map((val) => (
            <TouchableOpacity
              key={val}
              style={[styles.quickBtn, amount === val.toString() && styles.quickBtnActive]}
              onPress={() => setAmount(val.toString())}
              activeOpacity={0.8}
            >
              <Text style={[styles.quickBtnText, amount === val.toString() && styles.quickBtnTextActive]}>
                + {val}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) && styles.buttonDisabled]}
            onPress={handleTopUp}
            disabled={!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Proceed to Payment</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 32 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 24 },
  currencySymbol: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginRight: 12 },
  input: { flex: 1, fontSize: 32, fontWeight: '800', color: '#0f766e', padding: 0 },
  quickAmounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  quickBtn: { backgroundColor: '#e2e8f0', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#cbd5e1' },
  quickBtnActive: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  quickBtnText: { color: '#0f172a', fontWeight: '600', fontSize: 15 },
  quickBtnTextActive: { color: '#ffffff', fontWeight: '700' },
  footer: { marginTop: 32 },
  button: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f766e', padding: 20, borderRadius: 16, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' }
});
