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
import { TransitLogo } from '../components/TransitLogo';
import { InputField } from '../components/InputField';
import { AppButton } from '../components/Buttons';
import { UserIcon, LockIcon } from '../components/Icons';
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

  const handleGoogleSignIn = () => {
    showAlert('Google Sign-in', 'Redirecting to Google authentication...');
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

          <AppButton
            title="Continue with Google"
            onPress={handleGoogleSignIn}
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
});
