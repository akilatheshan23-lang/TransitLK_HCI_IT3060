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
import { UserIcon, LockIcon, CheckIcon } from '../components/Icons';
import { colors } from '../theme/colors';
import { api, UserProfile } from '../services/api';

interface RegisterScreenProps {
  onNavigateBack: () => void;
  onRegisterSuccess?: (user: UserProfile) => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateBack,
  onRegisterSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreateAccount = async () => {
    setErrorMessage('');
    if (!fullName.trim()) {
      showAlert('Name Required', 'Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      showAlert('Email Required', 'Please enter a valid email address.');
      return;
    }
    if (!password) {
      showAlert('Password Required', 'Please create a secure password.');
      return;
    }
    if (password.length < 8) {
      showAlert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      showAlert('Terms Required', 'Please agree to the Terms and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        name: fullName.trim(),
        email: email.trim(),
        password,
      });
      setLoading(false);

      if (res.success && res.user && res.token) {
        await api.saveSession(res.token, res.user);
        showAlert(
          'Account Created',
          `Welcome to TransitLK, ${res.user.name}! Your account has been saved to MongoDB successfully.`
        );
        onRegisterSuccess?.(res.user);
      } else {
        const msg = res.message || 'Registration failed.';
        setErrorMessage(msg);
        showAlert('Registration Failed', msg);
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Connection error.';
      setErrorMessage(msg);
      showAlert('Connection Error', msg);
    }
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
        title="Create account"
        onBackPress={onNavigateBack}
        showBell={true}
        onBellPress={() => showAlert('Notifications', 'No new notifications.')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading & Subtitle */}
        <View style={styles.headingSection}>
          <Text style={styles.headline}>Start your journey</Text>
          <Text style={styles.subtitle}>
            A few details and you are ready to go.
          </Text>
        </View>

        {/* Inputs */}
        <View style={styles.formSection}>
          <InputField
            label="Full name"
            placeholder="Kamal Perera"
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<UserIcon size={19} color={colors.teal.primary} />}
            accentColor={colors.teal.primary}
          />

          <InputField
            label="Email address"
            placeholder="name@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accentColor={colors.teal.primary}
          />

          <InputField
            label="Password"
            placeholder="Create a secure password"
            value={password}
            onChangeText={setPassword}
            isPassword={true}
            leftIcon={<LockIcon size={19} color={colors.teal.primary} />}
            accentColor={colors.teal.primary}
          />

          <InputField
            label="Confirm password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword={true}
            accentColor={colors.teal.primary}
          />
        </View>

        {/* Terms and Privacy Policy */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAgreeTerms(!agreeTerms)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, agreeTerms && styles.checkboxActive]}>
            {agreeTerms && <CheckIcon size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.termsText}>
            I agree to the Terms and Privacy Policy
          </Text>
        </TouchableOpacity>

        {/* Primary Action Button */}
        <View style={styles.buttonSection}>
          <AppButton
            title="Create account"
            onPress={handleCreateAccount}
            variant="teal"
            showArrow={true}
            loading={loading}
          />
        </View>

        {/* Already have an account */}
        <TouchableOpacity
          onPress={onNavigateBack}
          style={styles.loginLinkContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkBold}>Sign in</Text>
          </Text>
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
    paddingTop: 16,
    paddingBottom: 28,
  },
  headingSection: {
    marginBottom: 24,
    marginTop: 4,
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
    marginBottom: 6,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 6,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.neutral.inputBorder,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.teal.primary,
    borderColor: colors.teal.primary,
  },
  termsText: {
    fontSize: 13,
    color: colors.neutral.muted,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  buttonSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  loginLinkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
  loginLinkBold: {
    fontWeight: '800',
  },
});
