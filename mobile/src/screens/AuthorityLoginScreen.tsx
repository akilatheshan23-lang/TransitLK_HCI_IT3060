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

interface AuthorityLoginScreenProps {
  onNavigateBack: () => void;
  onLoginSuccess?: (user: UserProfile) => void;
}

export const AuthorityLoginScreen: React.FC<AuthorityLoginScreenProps> = ({
  onNavigateBack,
  onLoginSuccess,
}) => {
  const [officerId, setOfficerId] = useState('officer@transport.lk');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    setErrorMessage('');
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
          `Authenticated as ${res.user.name} (${res.user.email})`
        );
        onLoginSuccess?.(res.user);
      } else {
        const msg = res.message || 'Authentication failed. Please verify official credentials.';
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
        title="Authority Officer login"
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
          <Text style={styles.headline}>A clearer view of the whole network.</Text>
          <Text style={styles.subtitle}>
            Monitor services, performance and incidents.
          </Text>
        </View>

        {/* Role Access Banner */}
        <RoleAccessBadge
          label="Authority Officer access"
          variant="authority"
        />

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
