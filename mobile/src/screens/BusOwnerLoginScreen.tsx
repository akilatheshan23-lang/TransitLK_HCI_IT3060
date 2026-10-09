import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Header } from '../components/Header';
import { InputField } from '../components/InputField';
import { AppButton } from '../components/Buttons';
import { RoleAccessBadge } from '../components/RoleAccessBadge';
import { colors } from '../theme/colors';
import { platformShadow } from '../theme/shadows';
import { api, UserProfile } from '../services/api';

interface BusOwnerLoginScreenProps {
  onNavigateBack: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const BusOwnerLoginScreen: React.FC<BusOwnerLoginScreenProps> = ({
  onNavigateBack,
  onLoginSuccess,
}) => {
  // Mode: 'signin' | 'register'
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In fields
  const [ownerId, setOwnerId] = useState('owner@transitlk.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingStatusMessage, setPendingStatusMessage] = useState('');

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regBusRegNumbers, setRegBusRegNumbers] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage('');
    setPendingStatusMessage('');
    if (!ownerId.trim()) {
      showAlert('ID Required', 'Please enter your Registered email or Owner ID.');
      return;
    }
    if (!password) {
      showAlert('Password Required', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.ownerLogin({ ownerId, password });
      setLoading(false);

      if (res.success && res.user && res.token) {
        await api.saveSession(res.token, res.user);
        showAlert(
          'Bus Owner Access Granted',
          `Authenticated as ${res.user.name} (${res.user.email}). Opening Bus Owner Web Dashboard...`
        );
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const webUrl = `http://localhost:3001/?role=bus_owner&token=${encodeURIComponent(res.token)}`;
          window.open(webUrl, '_blank');
        }
        onLoginSuccess?.(res.user);
      } else {
        const msg = res.message || 'Authentication failed. Please verify owner credentials.';
        if (res.status === 'pending') {
          setPendingStatusMessage(msg);
        } else {
          setErrorMessage(msg);
          showAlert('Authentication Failed', msg);
        }
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Connection error.';
      setErrorMessage(msg);
      showAlert('Connection Error', msg);
    }
  };

  const handleRegister = async () => {
    setErrorMessage('');
    if (!regName.trim()) {
      showAlert('Name Required', 'Please enter the owner full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      showAlert('Email Required', 'Please enter a valid business contact email.');
      return;
    }
    if (!regCompanyName.trim()) {
      showAlert('Fleet Name Required', 'Please enter your fleet or company name.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      showAlert('Password Required', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerBusOwner({
        name: regName,
        email: regEmail,
        companyName: regCompanyName,
        busRegNumbers: regBusRegNumbers,
        phone: regPhone,
        password: regPassword,
      });
      setLoading(false);

      if (res.success) {
        setRegSuccess(true);
        showAlert(
          'Fleet Registration Submitted',
          'Your fleet owner registration has been submitted for Admin approval. An administrator must approve it before you can log in.'
        );
      } else {
        showAlert('Registration Failed', res.message || 'Could not submit registration.');
      }
    } catch (err: any) {
      setLoading(false);
      showAlert('Error', err.message || 'Network connection failed.');
    }
  };

  const handleForgotPassword = () => {
    showAlert(
      'Bus Owner Portal Support',
      'Password reset instructions will be dispatched to your registered fleet contact email.'
    );
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  return (
    <View style={styles.screen}>
      <Header
        title={mode === 'signin' ? 'Bus Owner login' : 'Bus Fleet Registration'}
        onBackPress={onNavigateBack}
        showBell={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Kicker */}
        <Text style={styles.kicker}>TRANSITLK / BUS OWNER</Text>

        {/* Headline & Subtitle */}
        <View style={styles.headingSection}>
          <Text style={styles.headline}>
            {mode === 'signin'
              ? 'Manage your fleet and daily operations.'
              : 'Register your bus fleet on TransitLK.'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Track revenue, routes, schedules, and bus performance.'
              : 'Submit operator details for verification and fleet access.'}
          </Text>
        </View>

        {/* Role Access Banner */}
        <RoleAccessBadge
          label="Bus Fleet Operator Portal"
          variant="owner"
        />

        {/* Mode Switcher Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'signin' && styles.tabButtonActive]}
            onPress={() => {
              setMode('signin');
              setPendingStatusMessage('');
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, mode === 'signin' && styles.tabButtonTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
            onPress={() => {
              setMode('register');
              setRegSuccess(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, mode === 'register' && styles.tabButtonTextActive]}>
              Register Fleet
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'signin' ? (
          <>
            {/* Pending status warning banner if owner is waiting for admin approval */}
            {pendingStatusMessage ? (
              <View style={styles.pendingBanner}>
                <View style={styles.pendingBadgeRow}>
                  <Text style={styles.pendingBadgeDot}>⏳</Text>
                  <Text style={styles.pendingBadgeTitle}>Pending Admin Approval</Text>
                </View>
                <Text style={styles.pendingBannerText}>{pendingStatusMessage}</Text>
                <Text style={styles.pendingBannerSubtext}>
                  The system administrator needs to approve your registration in the Admin Dashboard website before you can access your fleet.
                </Text>
              </View>
            ) : null}

            {/* Inputs */}
            <View style={styles.formSection}>
              <InputField
                label="Registered email / Owner ID"
                placeholder="owner@transitlk.com"
                value={ownerId}
                onChangeText={setOwnerId}
                autoCapitalize="none"
                accentColor={colors.teal.primary}
              />

              <InputField
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                isPassword={true}
                accentColor={colors.teal.primary}
              />

              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordContainer}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Primary Action Button */}
            <View style={styles.buttonSection}>
              <AppButton
                title="Sign in as Bus Owner"
                onPress={handleSignIn}
                variant="teal"
                showArrow={false}
                loading={loading}
              />
            </View>

            {/* Registration Prompt Link */}
            <TouchableOpacity
              style={styles.switchModeLink}
              onPress={() => setMode('register')}
              activeOpacity={0.7}
            >
              <Text style={styles.switchModeText}>
                New Bus Owner?{' '}
                <Text style={styles.switchModeBold}>Register your fleet</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Registration Form */
          <>
            {regSuccess ? (
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>Registration Submitted!</Text>
                <Text style={styles.successMessage}>
                  Your bus fleet registration has been submitted for administrator verification.
                </Text>
                <Text style={styles.successSubtext}>
                  Once the administrator approves your fleet on the Admin Dashboard website, you will be able to sign in with your email and password.
                </Text>
                <TouchableOpacity
                  style={styles.returnToSignInBtn}
                  onPress={() => {
                    setOwnerId(regEmail);
                    setMode('signin');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.returnToSignInText}>Proceed to Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.returnToSignInBtn, { backgroundColor: colors.teal.primary, marginTop: 10 }]}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.open('http://localhost:3001/?role=bus_owner', '_blank');
                    } else {
                      showAlert('Web Dashboard', 'Access your fleet dashboard at http://localhost:3001/?role=bus_owner');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.returnToSignInText, { color: '#FFFFFF' }]}>
                    Open Bus Owner Web Dashboard ↗
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formSection}>
                <InputField
                  label="Owner / Representative Full Name"
                  placeholder="e.g. Sunil Perera"
                  value={regName}
                  onChangeText={setRegName}
                  accentColor={colors.teal.primary}
                />

                <InputField
                  label="Business Email Address"
                  placeholder="sunil.transport@gmail.com"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accentColor={colors.teal.primary}
                />

                <InputField
                  label="Fleet / Company Name"
                  placeholder="e.g. Southern Express Line (Pvt) Ltd"
                  value={regCompanyName}
                  onChangeText={setRegCompanyName}
                  accentColor={colors.teal.primary}
                />

                <InputField
                  label="Bus Registration Numbers (Optional)"
                  placeholder="e.g. WP ND-3204, WP ND-5521"
                  value={regBusRegNumbers}
                  onChangeText={setRegBusRegNumbers}
                  accentColor={colors.teal.primary}
                />

                <InputField
                  label="Contact Phone (Optional)"
                  placeholder="071 987 6543"
                  value={regPhone}
                  onChangeText={setRegPhone}
                  keyboardType="phone-pad"
                  accentColor={colors.teal.primary}
                />

                <InputField
                  label="Set Password"
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  isPassword={true}
                  accentColor={colors.teal.primary}
                />

                <View style={styles.approvalNoteBox}>
                  <Text style={styles.approvalNoteTitle}>🛡️ Admin Approval Required</Text>
                  <Text style={styles.approvalNoteText}>
                    Upon submission, your fleet application will appear in the Admin Dashboard website for verification. You will be able to sign in once approved.
                  </Text>
                </View>

                <View style={styles.buttonSection}>
                  <AppButton
                    title="Submit Fleet Registration"
                    onPress={handleRegister}
                    variant="teal"
                    showArrow={false}
                    loading={loading}
                  />
                </View>

                <TouchableOpacity
                  style={styles.switchModeLink}
                  onPress={() => setMode('signin')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchModeText}>
                    Already registered?{' '}
                    <Text style={styles.switchModeBold}>Sign in here</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Back to main sign in */}
        <TouchableOpacity
          onPress={onNavigateBack}
          style={styles.backToMainContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.backToMainText}>Back to main sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 28,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 8,
  },
  headingSection: {
    marginBottom: 6,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.neutral.title,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.neutral.muted,
    marginTop: 6,
    letterSpacing: -0.1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginVertical: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...platformShadow({ color: '#000', width: 0, height: 2, opacity: 0.08, radius: 4, elevation: 2 }),
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.muted,
  },
  tabButtonTextActive: {
    color: colors.teal.primary,
    fontWeight: '700',
  },
  pendingBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1.2,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  pendingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  pendingBadgeDot: {
    fontSize: 16,
  },
  pendingBadgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
  },
  pendingBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    lineHeight: 18,
    marginBottom: 6,
  },
  pendingBannerSubtext: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  formSection: {
    marginBottom: 8,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
  buttonSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  switchModeLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  switchModeText: {
    fontSize: 14,
    color: colors.neutral.muted,
  },
  switchModeBold: {
    fontWeight: '700',
    color: colors.teal.primary,
  },
  approvalNoteBox: {
    backgroundColor: '#E6F4F2',
    borderWidth: 1,
    borderColor: '#A8DCD7',
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
  },
  approvalNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal.primary,
    marginBottom: 4,
  },
  approvalNoteText: {
    fontSize: 12,
    color: '#0D544F',
    lineHeight: 17,
  },
  successCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    marginVertical: 14,
  },
  successIcon: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16A34A',
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 6,
  },
  successMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 12,
    color: '#15803D',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  returnToSignInBtn: {
    backgroundColor: colors.teal.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  returnToSignInText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  backToMainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  backToMainText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
});
