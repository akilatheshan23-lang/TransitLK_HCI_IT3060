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
import { api, UserProfile } from '../services/api';

interface BusOwnerLoginScreenProps {
  onNavigateBack: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const BusOwnerLoginScreen: React.FC<BusOwnerLoginScreenProps> = ({
  onNavigateBack,
  onLoginSuccess,
}) => {
  const [ownerId, setOwnerId] = useState('owner@transitlk.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    setErrorMessage('');
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
          `Authenticated as ${res.user.name} (${res.user.email})`
        );
        onLoginSuccess?.(res.user);
      } else {
        const msg = res.message || 'Authentication failed. Please verify owner credentials.';
        setErrorMessage(msg);
        showAlert('Authentication Failed', msg);
      }
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Connection error.';
      setErrorMessage(msg);
      showAlert('Connection Error', msg);
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
        title="Bus Owner login"
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
          <Text style={styles.headline}>Manage your fleet and daily operations.</Text>
          <Text style={styles.subtitle}>
            Track revenue, routes, schedules, and bus performance.
          </Text>
        </View>

        {/* Role Access Banner */}
        <RoleAccessBadge
          label="Bus Owner access"
          variant="owner"
        />

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
