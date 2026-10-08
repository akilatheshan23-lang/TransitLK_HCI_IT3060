import TransitApp from './src/TransitApp';
import OwnerDashboard from './src/OwnerDashboard';
import FleetTrackingScreen from './src/FleetTrackingScreen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BusArtwork, Icon } from './src/Artwork';
import { PhoneFrame } from './src/PhoneFrame';
import { colors as c } from './src/theme';
import { copy, Language } from './src/i18n';
import AuthorityLoginScreen from './src/authority/AuthorityLoginScreen';
import AuthorityDashboardScreen from './src/authority/AuthorityDashboardScreen';
import { api, ApiError, restoreSession, saveSession, User, API_BASE_URL } from './src/api';

type Sheet = 'register' | 'login' | 'profile' | 'notifications' | 'about' | null;

function Button({ label, onPress, secondary = false, busy = false }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, pressed && s.pressed, busy && { opacity: 0.65 }]}>
      <Text style={[s.buttonText, secondary && { color: c.navy }]}>{label}</Text>
      {busy ? <ActivityIndicator color={secondary ? c.teal : c.white} /> : <Icon name="arrow" size={21} color={secondary ? c.teal : c.white} />}
    </Pressable>
  );
}

function Welcome() {
  const insets = useSafeAreaInsets();
  const [showTransit, setShowTransit] = useState(false);
  const [showOfficerLogin, setShowOfficerLogin] =useState(false);
  const [ownerScreen, setOwnerScreen] = useState<'dashboard' | 'fleet'>('dashboard');
  const [lang, setLang] = useState<Language>('en');
  const t = copy[lang];
  const [sheet, setSheet] = useState<Sheet>(null);
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notificationState, setNotificationState] = useState<'loading' | 'ready' | 'error'>('loading');
  
  const openWebsiteDashboard = () => {
    const url = `${API_BASE_URL}/owner`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      void Linking.openURL(url);
    }
  };
  const openAuthorityWebsiteDashboard = () => {
  const url = `${API_BASE_URL}/authority`;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank');
  } else {
    void Linking.openURL(url);
  }
};

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const local = await AsyncStorage.getItem('transitlk-language');
        if (active && ['en', 'ta', 'si'].includes(local || '')) setLang(local as Language);
        if (await restoreSession()) {
          try {
            const data = await api<{ user: User }>('/me');
            if (active) {
              setUser(data.user);
              setLang(data.user.language);
              if (data.user.role === 'owner') setOwnerScreen('dashboard');
              setShowTransit(true);
            }
          } catch (e) {
            if (e instanceof ApiError && e.status === 401) await saveSession(null);
          }
        }
      } catch {
        /* Storage failure fallback */
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function open(value: Sheet) {
    setError(''); setNotice(''); setPassword(''); setConfirm(''); setSheet(value);
    if (value === 'notifications') void loadNotifications();
  }

  async function loadNotifications() {
    setNotificationState('loading');
    try { await api('/home'); setNotificationState('ready'); } catch { setNotificationState('error'); }
  }

  async function changeLanguage(value: Language) {
    if (busy || value === lang) return;
    setBusy(true); setNotice('');
    try {
      if (user) { const data = await api<{ user: User }>('/me/preferences', 'PATCH', { language: value }); setUser(data.user); }
      setLang(value);
      await AsyncStorage.setItem('transitlk-language', value);
    } catch (e) {
      setNotice(e instanceof ApiError ? e.message : t.offline);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8 || password.length > 128 || (sheet === 'register' && name.trim().length < 2)) {
      setError(t.invalid);
      return;
    }
    if (sheet === 'register' && password !== confirm) {
      setError(t.mismatch);
      return;
    }
    setBusy(true); setError('');
    try {
      const payload = sheet === 'register' ? { name: name.trim(), email: email.trim(), password, language: lang } : { email: email.trim(), password };
      const data = await api<{ user: User; token: string }>(sheet === 'register' ? '/auth/register' : '/auth/login', 'POST', payload);
      try { await saveSession(data.token); } catch { setError(t.storage); return; }
      setUser(data.user); setLang(data.user.language); setPassword(''); setConfirm(''); setSheet(null);
      if (data.user.role === 'owner') setOwnerScreen('dashboard');
      setShowTransit(true);
      await AsyncStorage.setItem('transitlk-language', data.user.language).catch(() => {});
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t.offline);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true); setError('');
    try {
      await api('/auth/logout', 'POST');
      await saveSession(null); setUser(null); setSheet(null); setShowTransit(false); setOwnerScreen('dashboard');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { await saveSession(null); setUser(null); setSheet(null); setOwnerScreen('dashboard'); }
      else setError(t.offline);
    } finally {
      setBusy(false);
    }
  }

  async function loadStaffAccess(role: 'owner' | 'officer') {
    setPassword('');
    setNotice('Sign in with your provisioned staff account. Contact your administrator for access.');
  }

  function googleSignIn() {
    setNotice('Google sign-in is not connected yet. Please use email and password.');
  }

  function openOfficerLogin() {
  setSheet(null);
  setError('');
  setNotice('');
  setPassword('');
  setShowOfficerLogin(true);
}

  const title = sheet === 'register' ? t.register : sheet === 'login' ? t.login : sheet === 'notifications' ? t.notifications : sheet === 'profile' ? t.signedIn : 'TransitLK';

  const sheetContentElement = (
    <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]} accessibilityViewIsModal>
      {/* Top Header Row matching mockup */}
      <View style={s.sheetHeaderRow}>
        <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={t.back} onPress={() => setSheet(null)} style={s.iconButton}>
          <Icon name="back" size={20} />
        </Pressable>
        <Text accessibilityRole="header" style={s.sheetHeaderTitle}>{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t.notifications} onPress={() => open('notifications')} style={s.iconButton}>
          <Icon name="bell" size={20} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.sheetContent}>
        {sheet === 'login' && (
          <>
            {/* TransitLK Brand */}
            <View style={s.brand}>
              <View style={s.brandIcon}><Icon name="bus" color="white" size={24} /></View>
              <Text style={s.brandName}>TransitLK</Text>
            </View>

            {/* Headline matching screenshot */}
            <Text style={s.loginHeadline}>{t.loginTitle}</Text>
            <Text style={s.loginSub}>Sign in to plan your next journey.</Text>

            {/* Email Field with User Icon */}
            <View style={s.field}>
              <Text style={s.label}>{t.email}</Text>
              <View style={s.inputWrap}>
                <Icon name="user" size={18} color={c.muted} />
                <TextInput accessibilityLabel={t.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254} autoComplete="email" style={s.input} placeholder="name@example.com" placeholderTextColor={c.muted} editable={!busy} />
              </View>
            </View>

            {/* Password Field with Lock and Eye Toggle */}
            <View style={s.field}>
              <Text style={s.label}>{t.password}</Text>
              <View style={s.inputWrap}>
                <Icon name="lock" size={18} color={c.muted} />
                <TextInput accessibilityLabel={t.password} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} maxLength={128} autoComplete="current-password" style={s.input} placeholder={t.passwordHint} placeholderTextColor={c.muted} editable={!busy} onSubmitEditing={() => void submit()} />
                <Pressable accessibilityRole="button" accessibilityLabel="Toggle password visibility" onPress={() => setShowPassword(!showPassword)} style={s.eyeToggle}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={c.muted} />
                </Pressable>
              </View>
            </View>

            {/* Forgot Password Link */}
            <Pressable onPress={() => setNotice('Password reset link will be sent to ' + (email || 'your email'))} style={s.forgotWrap}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </Pressable>

            {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            {!!notice && <Text accessibilityRole="alert" style={s.noticeText}>{notice}</Text>}

            {/* Sign in Button */}
            <Button label={t.login} onPress={() => void submit()} busy={busy} />

            {/* Continue with Google */}
            <Pressable accessibilityRole="button" disabled={busy} onPress={googleSignIn} style={s.googleButton}>
              <View style={s.googleInner}>
                <Icon name="google" size={18} />
                <Text style={s.googleText}>Continue with Google</Text>
              </View>
              <Icon name="arrow" size={18} color={c.muted} />
            </Pressable>

            {/* Switch to Register */}
            <Pressable accessibilityRole="button" onPress={() => open('register')} disabled={busy} style={s.switch}>
              <Text style={s.switchText}>New to TransitLK? <Text style={s.linkBold}>Create an account</Text></Text>
            </Pressable>

            {/* Staff & Business Access matching Image 2 */}
            <View style={s.staffSection}>
              <Text style={s.staffHeading}>STAFF & BUSINESS ACCESS</Text>
              <View style={s.staffRow}>
                <Pressable onPress={() => loadStaffAccess('owner')} style={s.staffBtn}>
                  <Text style={s.staffBtnText}>Bus Owner</Text>
                </Pressable>
                <Pressable
                onPress={openOfficerLogin}
                style={s.staffBtn}
      >
              <Text style={s.staffBtnText}>
                Authority Officer
              </Text>
              </Pressable>
              </View>
            </View>
          </>
        )}

        {sheet === 'register' && (
          <>
            <View style={s.brand}>
              <View style={s.brandIcon}><Icon name="bus" color="white" size={24} /></View>
              <Text style={s.brandName}>TransitLK</Text>
            </View>

            <Text style={s.loginHeadline}>{t.next}</Text>
            <Text style={s.loginSub}>{t.formIntro}</Text>

            <View style={s.field}>
              <Text style={s.label}>{t.name}</Text>
              <View style={s.inputWrap}>
                <Icon name="user" size={18} color={c.muted} />
                <TextInput accessibilityLabel={t.name} value={name} onChangeText={setName} autoCapitalize="words" maxLength={80} autoComplete="name" style={s.input} placeholder={t.name} placeholderTextColor={c.muted} editable={!busy} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t.email}</Text>
              <View style={s.inputWrap}>
                <Icon name="user" size={18} color={c.muted} />
                <TextInput accessibilityLabel={t.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254} autoComplete="email" style={s.input} placeholder="name@example.com" placeholderTextColor={c.muted} editable={!busy} />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t.password}</Text>
              <View style={s.inputWrap}>
                <Icon name="lock" size={18} color={c.muted} />
                <TextInput accessibilityLabel={t.password} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" maxLength={128} autoComplete="new-password" style={s.input} placeholder={t.passwordHint} placeholderTextColor={c.muted} editable={!busy} />
                <Pressable accessibilityRole="button" onPress={() => setShowPassword(!showPassword)} style={s.eyeToggle}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={c.muted} />
                </Pressable>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>{t.confirm}</Text>
              <View style={s.inputWrap}>
                <Icon name="lock" size={18} color={c.muted} />
                <TextInput accessibilityLabel={t.confirm} value={confirm} onChangeText={setConfirm} secureTextEntry={!showPassword} autoCapitalize="none" maxLength={128} autoComplete="new-password" style={s.input} placeholder={t.confirm} placeholderTextColor={c.muted} editable={!busy} onSubmitEditing={() => void submit()} />
              </View>
            </View>

            {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            <Button label={t.register} onPress={() => void submit()} busy={busy} />

            <Pressable accessibilityRole="button" onPress={() => open('login')} disabled={busy} style={s.switch}>
              <Text style={s.switchText}>Already have an account? <Text style={s.linkBold}>Sign in</Text></Text>
            </Pressable>
          </>
        )}

        {sheet === 'profile' && user && (
          <>
            <View style={s.successIcon}><Icon name="check" size={32} color={c.teal} /></View>
            <Text style={s.profileName}>{user.name}</Text>
            <Text style={s.centerText}>{user.email}</Text>
            <Text style={s.sheetIntro}>{t.saved}</Text>
            <Button
              label={
                user.role === 'owner'
                  ? 'Owner Dashboard'
                  : user.role === 'officer'
                    ? 'Authority Dashboard'
                    : 'Find my ride'
              } onPress={() => { setSheet(null); setShowTransit(true); }} />
            {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
            <Button label={t.logout} onPress={() => void logout()} secondary busy={busy} />
          </>
        )}

        {sheet === 'notifications' && (
          <View style={s.empty}>
            {notificationState === 'loading' ? (
              <ActivityIndicator color={c.teal} />
            ) : notificationState === 'error' ? (
              <>
                <Text accessibilityRole="alert" style={s.centerText}>{t.offline}</Text>
                <Button label={t.retry} onPress={() => void loadNotifications()} />
              </>
            ) : (
              <>
                <View style={s.successIcon}><Icon name="bell" size={30} color={c.teal} /></View>
                <Text style={s.emptyTitle}>{t.empty}</Text>
                <Text style={s.centerText}>{t.emptyBody}</Text>
              </>
            )}
          </View>
        )}

        {sheet === 'about' && (
          <>
            <View style={s.aboutArt}><BusArtwork /></View>
            <Text style={s.tagline}>{t.tagline}</Text>
            <Text style={s.sheetIntro}>{t.description}</Text>
            <Button label={t.close} onPress={() => setSheet(null)} />
          </>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={s.stage}>
      <StatusBar style="dark" />
      {showOfficerLogin ? (
  <AuthorityLoginScreen
    onBack={() => {
      setShowOfficerLogin(false);
      open('login');
    }}
    onSignedIn={(officer) => {
      setUser(officer);
      setLang(officer.language);
      setShowOfficerLogin(false);
      setShowTransit(true);
    }}
  />
) : showTransit ? (
        user?.role === 'owner' ? (
          ownerScreen === 'fleet' ? (
            <FleetTrackingScreen
              onBack={() => setOwnerScreen('dashboard')}
              onOpenWebDashboard={openWebsiteDashboard}
            />
          ) : (
            <OwnerDashboard
              user={user}
              onViewFleet={() => setOwnerScreen('fleet')}
              onSignOut={logout}
              onBack={() => setShowTransit(false)}
              onOpenWebDashboard={openWebsiteDashboard}
            />
          )
          ) : user?.role === 'officer' ? (
  <AuthorityDashboardScreen
    user={user}
    onBack={() =>
      setShowTransit(false)
    }
    onSignOut={() =>
      void logout()
    }
    onOpenWebDashboard={
      openAuthorityWebsiteDashboard
    }
  />
        ) : (
          <TransitApp user={user} onProfile={() => open(user ? 'profile' : 'login')} onWelcome={() => setShowTransit(false)} onNotifications={() => open('notifications')} />
        )
      ) : (
        <View style={[s.screen, { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 10 : 12) }]}>
          <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 16) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.header}>
              <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={() => open('about')} style={s.iconButton}>
                <Icon name="back" size={20} />
              </Pressable>
              <Text style={s.headerTitle}>{t.welcome}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t.notifications} onPress={() => open('notifications')} style={s.iconButton}>
                <Icon name="bell" size={20} />
              </Pressable>
            </View>

            <View style={s.brand}>
              <View style={s.brandIcon}><Icon name="bus" color="white" size={25} /></View>
              <Text style={s.brandName}>TransitLK</Text>
            </View>

            <View style={s.headline}>
              <Text accessibilityRole="header" style={s.city}>{t.city}</Text>
              <Text style={s.journey}>{t.journey}</Text>
            </View>

            <View style={s.artwork}><BusArtwork /></View>

            <View style={s.caption}>
              <Text style={s.tagline}>{t.tagline}</Text>
              <Text style={s.description}>{t.description}</Text>
            </View>

            <View style={s.spacer} />

            <View style={s.actions}>
              <Button
                  label={
                        user
                          ? user.role === 'owner'
                            ? 'Owner Dashboard'
                            : user.role === 'officer'
                              ? 'Authority Dashboard'
                              : 'Find my ride'
                          : t.start
              } onPress={() => user ? setShowTransit(true) : open('register')} busy={restoring} />
              {!user && (
                <Pressable accessibilityRole="button" onPress={() => setShowTransit(true)} style={s.switch}>
                  <Text style={s.switchText}>Explore journeys</Text>
                </Pressable>
              )}
              {!user && <Button label={t.account} onPress={() => open('login')} secondary busy={restoring} />}
              {!!notice && <Text accessibilityRole="alert" style={s.error}>{notice}</Text>}
            </View>

            <View style={s.languages} accessibilityLabel={t.language}>
              {([{ value: 'en', label: 'ENGLISH' }, { value: 'ta', label: 'தமிழ்' }, { value: 'si', label: 'සිංහල' }] as const).map(l => (
                <Pressable key={l.value} onPress={() => void changeLanguage(l.value)} disabled={busy} accessibilityRole="button" accessibilityLabel={l.label} accessibilityState={{ selected: lang === l.value, disabled: busy }} style={s.languageButton}>
                  <Text style={[s.languageText, lang === l.value && s.languageSelected]}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Render modal contained within phone frame on web, or native modal on iOS/Android */}
      {Platform.OS === 'web' ? (
        sheet !== null && (
          <View style={s.webOverlay}>
            {sheetContentElement}
          </View>
        )
      ) : (
        <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => { if (!busy) setSheet(null); }}>
          <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {sheetContentElement}
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PhoneFrame>
        <Welcome />
      </PhoneFrame>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center', width: '100%' },
  screen: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: c.background, position: 'relative' },
  content: { flexGrow: 1, paddingHorizontal: 22 },
  header: { flexDirection: 'row', alignItems: 'center', marginLeft: -8, marginRight: -8, marginBottom: 18, gap: 4 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: c.navy },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  brandIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: c.teal, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 24, fontWeight: '700', color: c.navy, letterSpacing: -0.6 },
  headline: { gap: 4, marginBottom: 22 },
  city: { fontSize: 34, fontWeight: '700', color: c.navy, letterSpacing: -0.7 },
  journey: { fontSize: 29, fontWeight: '700', color: c.teal, letterSpacing: -0.5, lineHeight: 37 },
  artwork: { width: '100%', aspectRatio: 344 / 210, borderRadius: 22, overflow: 'hidden' },
  caption: { marginTop: 20, gap: 8 },
  tagline: { fontSize: 17, fontWeight: '700', color: c.navy, letterSpacing: -0.25 },
  description: { fontSize: 14, lineHeight: 22, color: c.muted },
  spacer: { flexGrow: 1, minHeight: 30 },
  actions: { gap: 10 },
  button: { minHeight: 52, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: c.teal, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  secondary: { backgroundColor: c.white, borderWidth: 1, borderColor: c.border },
  buttonText: { fontSize: 15, fontWeight: '700', color: c.white, flexShrink: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  languages: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 18, marginBottom: 10 },
  languageButton: { minWidth: 76, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  languageText: { color: c.muted, fontSize: 12 },
  languageSelected: { color: c.teal, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(9,28,39,0.5)', alignItems: 'center', justifyContent: 'flex-end' },
  webOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9,28,39,0.5)', alignItems: 'center', justifyContent: 'flex-end', zIndex: 100 },
  sheet: { width: '100%', maxWidth: 430, maxHeight: '94%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.background, overflow: 'hidden' },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: c.border },
  sheetHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.navy, textAlign: 'center' },
  sheetContent: { padding: 22, paddingTop: 14 },
  loginHeadline: { fontSize: 26, fontWeight: '800', color: c.navy, letterSpacing: -0.5, marginBottom: 6 },
  loginSub: { fontSize: 14, color: c.muted, lineHeight: 21, marginBottom: 20 },
  field: { gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: c.navy },
  inputWrap: { backgroundColor: 'white', borderWidth: 1, borderColor: c.border, borderRadius: 13, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  input: { flex: 1, minHeight: 48, color: c.navy, fontSize: 15, paddingVertical: 10 },
  eyeToggle: { padding: 8 },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 16 },
  forgotText: { color: c.muted, fontSize: 13, fontWeight: '500' },
  googleButton: { minHeight: 50, borderRadius: 15, backgroundColor: 'white', borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 10 },
  googleInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleText: { fontSize: 14, fontWeight: '600', color: c.navy },
  staffSection: { marginTop: 24, paddingTop: 18, borderTopWidth: 1, borderColor: c.border },
  staffHeading: { fontSize: 11, fontWeight: '700', color: c.muted, letterSpacing: 0.8, marginBottom: 12, textAlign: 'center' },
  staffRow: { flexDirection: 'row', gap: 12 },
  staffBtn: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BFE7DF' },
  staffBtnText: { color: c.teal, fontSize: 13, fontWeight: '700' },
  error: { fontSize: 13, color: c.error, lineHeight: 20, marginBottom: 14 },
  noticeText: { fontSize: 13, color: c.teal, lineHeight: 20, marginBottom: 14, fontWeight: '600' },
  switch: { paddingVertical: 14, alignItems: 'center' },
  switchText: { color: c.muted, fontSize: 14 },
  linkBold: { color: c.teal, fontWeight: '700' },
  empty: { paddingVertical: 26, gap: 16 },
  emptyTitle: { textAlign: 'center', fontSize: 20, fontWeight: '700', color: c.navy },
  centerText: { textAlign: 'center', color: c.muted, fontSize: 15, lineHeight: 23 },
  sheetIntro: { fontSize: 15, lineHeight: 23, color: c.muted, marginBottom: 20 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 18 },
  profileName: { fontSize: 22, fontWeight: '700', color: c.navy, textAlign: 'center', marginBottom: 10 },
  aboutArt: { height: 180, marginBottom: 24 }
});
