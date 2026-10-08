import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Header } from '../components/Header';
import { TransitLogo } from '../components/TransitLogo';
import { InputField } from '../components/InputField';
import { AppButton } from '../components/Buttons';
import { UserIcon, LockIcon, GoogleColorIcon } from '../components/Icons';
import { colors } from '../theme/colors';
import { api, UserProfile } from '../services/api';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToAuthority: () => void;
  onNavigateToBusOwner: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToAuthority,
  onNavigateToBusOwner,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('janith_test@transitlk.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Google Sign-in state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage('');
    if (!email.trim()) {
      showAlert('Email Required', 'Please enter your email address to sign in.');
      return;
    }
    if (!password) {
      showAlert('Password Required', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setLoading(false);

      if (res.success && res.user && res.token) {
        await api.saveSession(res.token, res.user);
        showAlert('Signed In', `Welcome back to TransitLK, ${res.user.name || res.user.email}!`);
        onLoginSuccess?.(res.user);
      } else {
        const msg = res.message || 'Authentication failed. Please check your credentials.';
        setErrorMessage(msg);
        showAlert('Sign In Failed', msg);
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Network connection failed.';
      setErrorMessage(msg);
      showAlert('Connection Error', msg);
    }
  };

  const handleGoogleAccountSelect = async (account: { email: string; name: string }) => {
    setGoogleLoading(true);
    try {
      const res = await api.googleLogin({
        email: account.email,
        name: account.name,
      });
      setGoogleLoading(false);

      if (res.success && res.user && res.token) {
        await api.saveSession(res.token, res.user);
        setShowGoogleModal(false);
        showAlert(
          'Google Sign-In Successful',
          `Authenticated with Google as ${res.user.name} (${res.user.email}). Synced with MongoDB!`
        );
        onLoginSuccess?.(res.user);
      } else {
        showAlert('Google Sign-In Failed', res.message || 'Could not authenticate with Google.');
      }
    } catch (err: any) {
      setGoogleLoading(false);
      showAlert('Connection Error', err.message || 'Failed to reach TransitLK backend.');
    }
  };

  const handleCustomGoogleSubmit = () => {
    if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
      showAlert('Invalid Email', 'Please enter a valid Google email address.');
      return;
    }
    const name = customGoogleEmail.split('@')[0];
    handleGoogleAccountSelect({
      email: customGoogleEmail.trim(),
      name: name.charAt(0).toUpperCase() + name.slice(1),
    });
  };

  const handleForgotPassword = () => {
    showAlert(
      'Forgot Password',
      'Password reset instructions will be sent to your registered email address.'
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
        title="Sign in"
        showBell={true}
        onBellPress={() => showAlert('Notifications', 'No new notifications.')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandRow}>
          <TransitLogo />
        </View>

        {/* Heading & Subtitle */}
        <View style={styles.headingSection}>
          <Text style={styles.headline}>Good to see you again.</Text>
          <Text style={styles.subtitle}>Sign in to plan your next journey.</Text>
        </View>

        {/* Inputs */}
        <View style={styles.formSection}>
          <InputField
            label="Email address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<UserIcon size={19} color={colors.teal.primary} />}
            accentColor={colors.teal.primary}
          />

          <InputField
            label="Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            isPassword={true}
            leftIcon={<LockIcon size={19} color={colors.teal.primary} />}
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

        {/* Primary Action Buttons */}
        <View style={styles.buttonSection}>
          <AppButton
            title="Sign in"
            onPress={handleSignIn}
            variant="teal"
            showArrow={true}
            loading={loading}
          />

          <View style={{ height: 12 }} />

          {/* Continue with Google button matching Figma design */}
          <AppButton
            title="Continue with Google"
            onPress={() => setShowGoogleModal(true)}
            variant="google"
            showArrow={true}
            arrowColor={colors.teal.primary}
          />
        </View>

        {/* Registration Link */}
        <TouchableOpacity
          onPress={onNavigateToRegister}
          style={styles.registerLinkContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.registerLinkText}>
            New to TransitLK?{' '}
            <Text style={styles.registerLinkBold}>Create an account</Text>
          </Text>
        </TouchableOpacity>

        {/* Staff & Business Access */}
        <View style={styles.staffSection}>
          <Text style={styles.staffHeading}>STAFF & BUSINESS ACCESS</Text>
          <View style={styles.roleButtonsRow}>
            {/* Bus Owner Button */}
            <TouchableOpacity
              onPress={onNavigateToBusOwner}
              style={styles.roleCard}
              activeOpacity={0.8}
            >
              <Text style={styles.busOwnerText}>Bus Owner</Text>
            </TouchableOpacity>

            {/* Authority Officer Button */}
            <TouchableOpacity
              onPress={onNavigateToAuthority}
              style={styles.roleCard}
              activeOpacity={0.8}
            >
              <Text style={styles.authorityOfficerText}>Authority Officer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Google Sign-In Account Chooser Modal */}
      <Modal
        visible={showGoogleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Google Header */}
            <View style={styles.googleModalHeader}>
              <GoogleColorIcon size={28} />
              <Text style={styles.googleModalTitle}>Sign in with Google</Text>
              <Text style={styles.googleModalSubtitle}>
                Choose an account to continue to <Text style={{ fontWeight: '700' }}>TransitLK</Text>
              </Text>
            </View>

            {googleLoading ? (
              <View style={styles.googleLoadingContainer}>
                <ActivityIndicator size="large" color={colors.teal.primary} />
                <Text style={styles.googleLoadingText}>
                  Connecting to Google & syncing with MongoDB...
                </Text>
              </View>
            ) : (
              <View style={styles.accountsList}>
                {/* Account 1 */}
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() =>
                    handleGoogleAccountSelect({
                      email: 'janiththathsara@gmail.com',
                      name: 'Janith Thathsara',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: '#4285F4' }]}>
                    <Text style={styles.accountAvatarText}>J</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>Janith Thathsara</Text>
                    <Text style={styles.accountEmail}>janiththathsara@gmail.com</Text>
                  </View>
                </TouchableOpacity>

                {/* Account 2 */}
                <TouchableOpacity
                  style={styles.accountItem}
                  onPress={() =>
                    handleGoogleAccountSelect({
                      email: 'kamal.perera@gmail.com',
                      name: 'Kamal Perera',
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.accountAvatar, { backgroundColor: '#34A853' }]}>
                    <Text style={styles.accountAvatarText}>K</Text>
                  </View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>Kamal Perera</Text>
                    <Text style={styles.accountEmail}>kamal.perera@gmail.com</Text>
                  </View>
                </TouchableOpacity>

                {/* Custom Account Option */}
                {showCustomInput ? (
                  <View style={styles.customInputContainer}>
                    <TextInput
                      style={styles.customTextInput}
                      placeholder="Enter your Google email..."
                      placeholderTextColor={colors.neutral.placeholder}
                      value={customGoogleEmail}
                      onChangeText={setCustomGoogleEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.customSubmitBtn}
                      onPress={handleCustomGoogleSubmit}
                    >
                      <Text style={styles.customSubmitText}>Continue</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.useAnotherAccountBtn}
                    onPress={() => setShowCustomInput(true)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.accountAvatar, { backgroundColor: '#F1F5F9' }]}>
                      <UserIcon size={20} color={colors.neutral.muted} />
                    </View>
                    <Text style={styles.useAnotherText}>Use another Google account</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowGoogleModal(false);
                setShowCustomInput(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingBottom: 28,
  },
  brandRow: {
    marginBottom: 20,
    marginTop: 4,
  },
  headingSection: {
    marginBottom: 24,
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
  formSection: {
    marginBottom: 8,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 4,
    marginBottom: 18,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
  buttonSection: {
    marginTop: 2,
    marginBottom: 12,
  },
  registerLinkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
  registerLinkBold: {
    fontWeight: '800',
  },
  staffSection: {
    marginTop: 4,
  },
  staffHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.neutral.placeholder,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  roleButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  busOwnerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
  authorityOfficerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.authority.primary,
    letterSpacing: -0.1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 28, 46, 0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  googleModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  googleModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 10,
  },
  googleModalSubtitle: {
    fontSize: 13,
    color: colors.neutral.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  accountsList: {
    marginVertical: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  accountAvatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  accountEmail: {
    fontSize: 13,
    color: colors.neutral.muted,
    marginTop: 2,
  },
  useAnotherAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  useAnotherText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.title,
  },
  customInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  customTextInput: {
    flex: 1,
    height: 48,
    borderWidth: 1.2,
    borderColor: colors.neutral.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.neutral.title,
  },
  customSubmitBtn: {
    backgroundColor: colors.teal.primary,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  googleLoadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLoadingText: {
    fontSize: 14,
    color: colors.neutral.muted,
    marginTop: 14,
    textAlign: 'center',
  },
  modalCancelBtn: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.muted,
  },
});
