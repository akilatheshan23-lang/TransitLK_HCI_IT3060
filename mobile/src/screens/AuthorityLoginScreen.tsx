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

interface AuthorityLoginScreenProps {
  onNavigateBack: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const AuthorityLoginScreen: React.FC<AuthorityLoginScreenProps> = ({
  onNavigateBack,
  onLoginSuccess,
}) => {
  // Mode: 'signin' | 'register'
  const [mode, setMode] = useState<'signin' | 'register'>('signin');

  // Sign In fields
  const [officerId, setOfficerId] = useState('officer@transport.lk');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingStatusMessage, setPendingStatusMessage] = useState('');

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regOfficerId, setRegOfficerId] = useState('');
  const [regDepartment, setRegDepartment] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage('');
    setPendingStatusMessage('');
    if (!officerId.trim()) {
      showAlert('ID Required', 'Please enter your Official email or Officer ID.');
      return;
    }
    if (!password) {
      showAlert('Password Required', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.officerLogin({ officerId, password });
      setLoading(false);

      if (res.success && res.user && res.token) {
        await api.saveSession(res.token, res.user);
        showAlert(
          'Authority Access Granted',
          `Authenticated as ${res.user.name} (${res.user.email}). Opening Authority Officer Web Portal...`
        );
        onLoginSuccess?.(res.user);
      } else {
        const msg = res.message || 'Authentication failed. Please verify official credentials.';
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
      showAlert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      showAlert('Email Required', 'Please enter a valid official email address.');
      return;
    }
    if (!regOfficerId.trim()) {
      showAlert('Badge Required', 'Please enter your Officer ID or Badge number.');
      return;
    }
    if (!regDepartment.trim()) {
      showAlert('Department Required', 'Please enter your Authority division or department.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      showAlert('Password Required', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerOfficer({
        name: regName,
        email: regEmail,
        officerId: regOfficerId,
        department: regDepartment,
        phone: regPhone,
        password: regPassword,
      });
      setLoading(false);

      if (res.success) {
        setRegSuccess(true);
        showAlert(
          'Application Submitted',
          'Your officer registration has been submitted for Admin approval. An administrator must approve it before you can log in.'
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
      'Authority Portal Support',
      'Please contact the Ministry/Authority IT administrative desk to request credentials reset.'
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
        title={mode === 'signin' ? 'Authority Officer login' : 'Officer Registration'}
        onBackPress={onNavigateBack}
        showBell={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Kicker */}
        <Text style={styles.kicker}>TRANSITLK / AUTHORITY</Text>

        {/* Headline & Subtitle */}
        <View style={styles.headingSection}>
          <Text style={styles.headline}>
            {mode === 'signin' ? 'A clearer view of the whole network.' : 'Request Official Access.'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'signin'
              ? 'Monitor services, performance and incidents.'
              : 'Submit credentials for National Transport Commission verification.'}
          </Text>
        </View>

        {/* Role Access Banner */}
        <RoleAccessBadge
          label="Authority Officer Portal"
          variant="authority"
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
              New Officer Request
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'signin' ? (
          <>
            {/* Pending status warning banner if officer is waiting for admin approval */}
            {pendingStatusMessage ? (
              <View style={styles.pendingBanner}>
                <View style={styles.pendingBadgeRow}>
                  <Text style={styles.pendingBadgeDot}>⏳</Text>
                  <Text style={styles.pendingBadgeTitle}>Pending Admin Approval</Text>
                </View>
                <Text style={styles.pendingBannerText}>{pendingStatusMessage}</Text>
                <Text style={styles.pendingBannerSubtext}>
                  The system administrator needs to approve your registration in the Admin Dashboard website before you can access the system.
                </Text>
              </View>
            ) : null}

            {/* Inputs */}
            <View style={styles.formSection}>
              <InputField
                label="Official email / Officer ID"
                placeholder="officer@transport.lk"
                value={officerId}
                onChangeText={setOfficerId}
                autoCapitalize="none"
                accentColor={colors.authority.primary}
              />

              <InputField
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                isPassword={true}
                accentColor={colors.authority.primary}
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
                title="Sign in as Authority Officer"
                onPress={handleSignIn}
                variant="authority"
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
                New Authority Officer?{' '}
                <Text style={styles.switchModeBold}>Request registration</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Registration Form */
          <>
            {regSuccess ? (
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.successTitle}>Application Submitted!</Text>
                <Text style={styles.successMessage}>
                  Your officer registration has been recorded and submitted for administrator review.
                </Text>
                <Text style={styles.successSubtext}>
                  Once an administrator approves your application on the Admin Dashboard website, you will be able to log in with your email and password.
                </Text>
                <TouchableOpacity
                  style={styles.returnToSignInBtn}
                  onPress={() => {
                    setOfficerId(regEmail);
                    setMode('signin');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.returnToSignInText}>Proceed to Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.returnToSignInBtn, { backgroundColor: colors.authority.primary, marginTop: 10 }]}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      window.open('http://localhost:3001/?role=authority', '_blank');
                    } else {
                      showAlert('Web Portal', 'Access the Authority Officer Portal at http://localhost:3001/?role=authority');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.returnToSignInText, { color: '#FFFFFF' }]}>
                    Open Authority Web Portal ↗
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formSection}>
                <InputField
                  label="Official Full Name"
                  placeholder="e.g. Ranjith Wickramasinghe"
                  value={regName}
                  onChangeText={setRegName}
                  accentColor={colors.authority.primary}
                />

                <InputField
                  label="Official Email Address"
                  placeholder="name@transport.gov.lk"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accentColor={colors.authority.primary}
                />

                <InputField
                  label="Officer ID / Badge Number"
                  placeholder="e.g. NTC-OFF-882"
                  value={regOfficerId}
                  onChangeText={setRegOfficerId}
                  autoCapitalize="characters"
                  accentColor={colors.authority.primary}
                />

                <InputField
                  label="Department / Division"
                  placeholder="e.g. Western Province Transport Authority"
                  value={regDepartment}
                  onChangeText={setRegDepartment}
                  accentColor={colors.authority.primary}
                />

                <InputField
                  label="Contact Phone (Optional)"
                  placeholder="077 123 4567"
                  value={regPhone}
                  onChangeText={setRegPhone}
                  keyboardType="phone-pad"
                  accentColor={colors.authority.primary}
                />

                <InputField
                  label="Set Password"
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  isPassword={true}
                  accentColor={colors.authority.primary}
                />

                <View style={styles.approvalNoteBox}>
                  <Text style={styles.approvalNoteTitle}>🛡️ Admin Approval Required</Text>
                  <Text style={styles.approvalNoteText}>
                    Upon submission, your application will appear in the Admin Dashboard website for verification. You will be able to sign in once approved.
                  </Text>
                </View>

                <View style={styles.buttonSection}>
                  <AppButton
                    title="Submit Officer Application"
                    onPress={handleRegister}
                    variant="authority"
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
    color: colors.authority.kicker,
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
    color: colors.authority.primary,
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
    color: colors.authority.kicker,
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
    color: colors.authority.primary,
  },
  approvalNoteBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
  },
  approvalNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  approvalNoteText: {
    fontSize: 12,
    color: '#1E3A8A',
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
    backgroundColor: colors.authority.primary,
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
    color: colors.authority.kicker,
    letterSpacing: -0.1,
  },
});
