import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../../components/Header';
import { InputField } from '../../components/InputField';
import { AppButton } from '../../components/Buttons';
import { ScannerIcon, UserIcon, LockIcon, BusPictogram, CheckIcon } from '../../components/Icons';
import { colors } from '../../theme/colors';
import { platformShadow } from '../../theme/shadows';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, UserProfile } from '../../services/api';

interface ConductorLoginScreenProps {
  onNavigateBack: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const ConductorLoginScreen: React.FC<ConductorLoginScreenProps> = ({
  onNavigateBack,
  onLoginSuccess,
}) => {
  // Mode: 'signin' | 'register'
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In fields
  const [conductorId, setConductorId] = useState('conductor@transitlk.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regEmployeeId, setRegEmployeeId] = useState('');
  const [regBus, setRegBus] = useState('ND-4521');
  const [regRoute, setRegRoute] = useState('Route 120 (Colombo - Horana)');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleSignIn = async () => {
    setErrorMessage('');
    const cleanId = conductorId.trim();
    if (!cleanId) {
      showAlert('ID Required', 'Please enter your Conductor Email or Employee ID.');
      return;
    }
    if (!password) {
      showAlert('Password Required', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.conductorLogin({ conductorId: cleanId, password });
      setLoading(false);

      if (res.success && res.user && res.token) {
        await api.saveSession(res.token, res.user);
        await AsyncStorage.setItem('@conductor_profile', JSON.stringify(res.user));
        showAlert(
          'Conductor Duty Active',
          `Welcome aboard, ${res.user.name}! Conductor validation portal is now active.`
        );
        onLoginSuccess?.(res.user);
      } else {
        const msg = res.message || 'Authentication failed. Please verify conductor credentials.';
        setErrorMessage(msg);
        showAlert('Authentication Failed', msg);
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Connection error while contacting server.';
      setErrorMessage(msg);
      showAlert('Connection Error', msg);
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');
    if (!regName.trim()) {
      showAlert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      showAlert('Email Required', 'Please enter a valid email address.');
      return;
    }
    if (!regEmployeeId.trim()) {
      showAlert('Employee ID Required', 'Please enter your Conductor / Employee ID.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      showAlert('Password Required', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerConductor({
        name: regName.trim(),
        email: regEmail.trim(),
        employeeId: regEmployeeId.trim(),
        assignedBus: regBus.trim(),
        route: regRoute.trim(),
        phone: regPhone.trim(),
        password: regPassword,
      });
      setLoading(false);

      if (res.success && res.user && res.token) {
        await api.saveSession(res.token, res.user);
        await AsyncStorage.setItem('@conductor_profile', JSON.stringify(res.user));
        showAlert(
          'Conductor Registered',
          `Registration successful! Welcome, ${res.user.name}. Opening Conductor Dashboard...`
        );
        onLoginSuccess?.(res.user);
      } else {
        showAlert('Registration Failed', res.message || 'Could not register conductor account.');
      }
    } catch (err: any) {
      setLoading(false);
      showAlert('Error', err.message || 'Network connection failed.');
    }
  };

  const handleQuickDemoLogin = () => {
    setConductorId('conductor@transitlk.com');
    setPassword('password123');
    setErrorMessage('');
    setTimeout(() => {
      handleSignIn();
    }, 100);
  };

  return (
    <View style={styles.container}>
      <Header title="Conductor Portal" onBackPress={onNavigateBack} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Duty Access Badge */}
        <View style={styles.badgeWrapper}>
          <View style={styles.badgeContainer}>
            <ScannerIcon size={18} color="#0D9488" />
            <Text style={styles.badgeText}>CONDUCTOR ON-DUTY PORTAL</Text>
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.title}>
          {mode === 'signin' ? 'Conductor Sign In' : 'Register New Conductor'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'signin'
            ? 'Sign in with your employee badge ID or email to access live ticket verification, QR scanner, and passenger manifests.'
            : 'Register your conductor credentials to operate ticket verification and cash collection tools.'}
        </Text>

        {/* Segmented Control */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'signin' && styles.segmentBtnActive]}
            onPress={() => {
              setMode('signin');
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                mode === 'signin' && styles.segmentTextActive,
              ]}
            >
              Conductor Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'register' && styles.segmentBtnActive]}
            onPress={() => {
              setMode('register');
              setErrorMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentText,
                mode === 'register' && styles.segmentTextActive,
              ]}
            >
              Register Conductor
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        ) : null}

        {mode === 'signin' ? (
          /* ================= SIGN IN TAB ================= */
          <View style={styles.formContainer}>
            <InputField
              label="Conductor Email or Employee ID"
              placeholder="e.g. conductor@transitlk.com or EMP-1024"
              value={conductorId}
              onChangeText={(t) => {
                setConductorId(t);
                if (errorMessage) setErrorMessage('');
              }}
              leftIcon={<UserIcon size={18} color="#0D9488" />}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <InputField
              label="Duty Password"
              placeholder="Enter password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMessage) setErrorMessage('');
              }}
              isPassword
              leftIcon={<LockIcon size={18} color="#0D9488" />}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Quick Demo Access Bar */}
            <TouchableOpacity
              style={styles.demoFillBtn}
              onPress={handleQuickDemoLogin}
              activeOpacity={0.8}
            >
              <View style={styles.demoFillIcon}>
                <CheckIcon size={16} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.demoFillTitle}>⚡ Quick Demo Conductor Login</Text>
                <Text style={styles.demoFillSubtitle}>
                  Fill demo credentials (EMP-1024 / password123) & sign in instantly
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ marginTop: 16 }}>
              <AppButton
                title={loading ? 'Authenticating...' : 'Sign In as Conductor'}
                onPress={handleSignIn}
                variant="teal"
                loading={loading}
              />
            </View>
          </View>
        ) : (
          /* ================= REGISTER TAB ================= */
          <View style={styles.formContainer}>
            <InputField
              label="Full Name *"
              placeholder="e.g. Nimal Bandara"
              value={regName}
              onChangeText={setRegName}
              leftIcon={<UserIcon size={18} color="#0D9488" />}
            />

            <InputField
              label="Official / Contact Email *"
              placeholder="e.g. nimal.conductor@transitlk.com"
              value={regEmail}
              onChangeText={setRegEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<UserIcon size={18} color="#0D9488" />}
            />

            <InputField
              label="Conductor Badge / Employee ID *"
              placeholder="e.g. EMP-1024"
              value={regEmployeeId}
              onChangeText={setRegEmployeeId}
              autoCapitalize="characters"
              leftIcon={<ScannerIcon size={18} color="#0D9488" />}
            />

            <InputField
              label="Assigned Bus Number"
              placeholder="e.g. ND-4521"
              value={regBus}
              onChangeText={setRegBus}
              autoCapitalize="characters"
              leftIcon={<BusPictogram size={18} color="#0D9488" />}
            />

            <InputField
              label="Operating Route"
              placeholder="e.g. Route 120 (Colombo - Horana)"
              value={regRoute}
              onChangeText={setRegRoute}
            />

            <InputField
              label="Phone Number"
              placeholder="e.g. +94 77 123 4567"
              value={regPhone}
              onChangeText={setRegPhone}
              keyboardType="phone-pad"
            />

            <InputField
              label="Duty Password (min 6 chars) *"
              placeholder="Create password"
              value={regPassword}
              onChangeText={setRegPassword}
              isPassword
              leftIcon={<LockIcon size={18} color="#0D9488" />}
            />

            <View style={{ marginTop: 16 }}>
              <AppButton
                title={loading ? 'Registering...' : 'Register & Enter Conductor Mode'}
                onPress={handleRegister}
                variant="teal"
                loading={loading}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  badgeWrapper: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 20,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    ...platformShadow({
      color: '#000',
      width: 0,
      height: 2,
      opacity: 0.08,
      radius: 4,
      elevation: 2,
    }),
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '500',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...platformShadow({
      color: '#000',
      width: 0,
      height: 2,
      opacity: 0.04,
      radius: 6,
      elevation: 2,
    }),
  },
  demoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    gap: 12,
  },
  demoFillIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoFillTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  demoFillSubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
});
