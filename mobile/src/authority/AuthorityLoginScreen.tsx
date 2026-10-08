import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  api,
  ApiError,
  saveSession,
} from '../api';

import type { User } from '../api';
import { Icon } from '../Artwork';
import { colors as c } from '../theme';

type Props = {
  onBack: () => void;
  onSignedIn: (user: User) => void;
};

const authorityBlue = '#3F5FB8';
const authorityLight = '#E9EEFF';

export default function AuthorityLoginScreen({
  onBack,
  onSignedIn,
}: Props) {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signIn() {
    if (
      !/^\S+@\S+\.\S+$/.test(email.trim()) ||
      password.length < 8
    ) {
      setError(
        'Enter your official email and password.'
      );
      return;
    }

    setBusy(true);
    setError('');

    try {
      const result = await api<{
        user: User;
        token: string;
      }>(
        '/auth/login',
        'POST',
        {
          email: email.trim(),
          password,
        }
      );

      if (result.user.role !== 'officer') {
        setError(
          'This account does not have Authority Officer access.'
        );
        return;
      }

      await saveSession(result.token);

      onSignedIn(result.user);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not sign in right now.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 18),
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={styles.backButton}
          >
            <Icon
              name="back"
              size={20}
              color={c.navy}
            />
          </Pressable>

          <Text style={styles.headerTitle}>
            Authority Officer login
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>
            TRANSITLK / AUTHORITY
          </Text>

          <Text style={styles.title}>
            A clearer view of{'\n'}
            the whole network.
          </Text>

          <Text style={styles.subtitle}>
            Monitor services, performance and incidents.
          </Text>

          <View style={styles.accessBanner}>
            <Text style={styles.accessText}>
              Authority Officer access
            </Text>
          </View>

          <Text style={styles.label}>
            Official email / Officer ID
          </Text>

          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="officer@transport.lk"
            placeholderTextColor={c.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            style={styles.input}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={c.muted}
            secureTextEntry
            autoCapitalize="none"
            editable={!busy}
            style={styles.input}
            onSubmitEditing={() => void signIn()}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setError(
                'Contact your administrator to reset an Authority Officer password.'
              )
            }
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>
              Forgot password?
            </Text>
          </Pressable>

          {!!error && (
            <Text
              accessibilityRole="alert"
              style={styles.error}
            >
              {error}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void signIn()}
            style={({ pressed }) => [
              styles.signInButton,
              busy && styles.disabled,
              pressed && !busy && styles.pressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={c.white} />
            ) : (
              <Text style={styles.signInButtonText}>
                Sign in as Authority Officer
              </Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onBack}
            style={styles.mainSignIn}
          >
            <Text style={styles.mainSignInText}>
              Back to main sign in
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    backgroundColor: c.background,
    alignItems: 'center',
  },

  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: c.background,
  },

  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    color: c.navy,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 4,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
  },

  eyebrow: {
    color: authorityBlue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 16,
  },

  title: {
    color: c.navy,
    fontSize: 27,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  subtitle: {
    color: c.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 32,
  },

  accessBanner: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: authorityLight,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 26,
  },

  accessText: {
    color: authorityBlue,
    fontWeight: '700',
    fontSize: 14,
  },

  label: {
    color: c.muted,
    fontSize: 12,
    marginBottom: 8,
  },

  input: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    paddingHorizontal: 16,
    color: c.navy,
    fontSize: 15,
    marginBottom: 22,
  },

  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    marginTop: -7,
    marginBottom: 24,
  },

  forgotText: {
    color: authorityBlue,
    fontSize: 13,
    fontWeight: '600',
  },

  error: {
    color: c.error,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },

  signInButton: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: authorityBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  signInButtonText: {
    color: c.white,
    fontSize: 14,
    fontWeight: '700',
  },

  mainSignIn: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  mainSignInText: {
    color: authorityBlue,
    fontWeight: '700',
    fontSize: 13,
  },

  disabled: {
    opacity: 0.65,
  },

  pressed: {
    opacity: 0.82,
  },
});