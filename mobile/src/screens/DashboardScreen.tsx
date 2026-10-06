import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Header } from '../components/Header';
import {
  UserIcon,
  GlobeIcon,
  TicketIcon,
  ChatBubbleIcon,
  ScannerIcon,
  HomeIcon,
  LockIcon,
} from '../components/Icons';
import { InputField } from '../components/InputField';
import { AppButton } from '../components/Buttons';
import { colors } from '../theme/colors';
import { UserProfile, api } from '../services/api';

interface DashboardScreenProps {
  user: UserProfile;
  onLogout: () => void;
  onNavigateBack?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  onLogout,
  onNavigateBack,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English / Sinhala / Tamil');
  const [activeTab, setActiveTab] = useState<'home' | 'tickets' | 'community' | 'profile'>('profile');

  // Admin Verification Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const getAccountLabel = () => {
    if (user.role === 'authority') return 'Authority officer account';
    if (user.role === 'bus_owner') return 'Bus owner account';
    return 'Passenger account';
  };

  const handleLanguageToggle = () => {
    const langs = ['English / Sinhala / Tamil', 'සිංහල / English / தமிழ்', 'தமிழ் / English / සිංහල'];
    const nextIdx = (langs.indexOf(selectedLanguage) + 1) % langs.length;
    setSelectedLanguage(langs[nextIdx]);
  };

  const handleOpenAdminModal = () => {
    setAdminUsername('');
    setAdminPassword('');
    setAdminError('');
    setShowAdminModal(true);
  };

  const handleAdminVerify = async () => {
    const cleanUsername = adminUsername.trim();
    if (!cleanUsername) {
      setAdminError('Please enter admin username.');
      return;
    }
    if (!adminPassword) {
      setAdminError('Please enter admin password.');
      return;
    }

    setAdminLoading(true);
    setAdminError('');

    try {
      const res = await api.adminLogin({
        username: cleanUsername,
        password: adminPassword,
      });

      setAdminLoading(false);

      if (res.success) {
        setShowAdminModal(false);
        setAdminUsername('');
        setAdminPassword('');
        setAdminError('');

        // Resolve admin dashboard destination URL
        let dashboardUrl = res.adminDashboardUrl || 'http://localhost:3001';

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const hostname = window.location.hostname;
          if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
            dashboardUrl = `http://${hostname}:3001`;
          }
          window.open(dashboardUrl, '_blank');
        } else {
          // Real mobile device / Expo Go on Android Pixel 7
          if (dashboardUrl.includes('localhost')) {
            dashboardUrl = 'http://172.20.10.3:3001';
          }
          const canOpen = await Linking.canOpenURL(dashboardUrl).catch(() => false);
          if (canOpen) {
            await Linking.openURL(dashboardUrl);
          } else {
            Linking.openURL(dashboardUrl).catch(() => {
              showAlert(
                'Open Admin Dashboard',
                `Please open the admin portal in your browser: ${dashboardUrl}`
              );
            });
          }
        }
      } else {
        setAdminError(res.message || 'Invalid Admin Credentials. Access denied.');
      }
    } catch (err: any) {
      setAdminLoading(false);
      setAdminError(err.message || 'Network error while contacting admin service.');
    }
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <Header
        title="My profile"
        onBackPress={onNavigateBack || onLogout}
        showBack={true}
        showBell={true}
        onBellPress={() => showAlert('Notifications', 'No unread notifications.')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar Hero */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <UserIcon size={42} color={colors.teal.primary} />
          </View>
          <Text style={styles.userName}>{user.name || 'Kamal Perera'}</Text>
          <Text style={styles.accountSubtitle}>{getAccountLabel()}</Text>
        </View>

        {/* App Language Section */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>App language</Text>
          <TouchableOpacity
            style={styles.languageCard}
            onPress={handleLanguageToggle}
            activeOpacity={0.75}
          >
            <GlobeIcon size={20} color={colors.teal.primary} />
            <Text style={styles.languageText}>{selectedLanguage}</Text>
          </TouchableOpacity>
        </View>

        {/* Action Items List */}
        <View style={styles.actionsList}>
          {/* 1. My saved tickets */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => showAlert('My saved tickets', 'Tickets list will open here.')}
            activeOpacity={0.75}
          >
            <Text style={styles.actionCardText}>My saved tickets</Text>
            <TicketIcon size={22} color={colors.teal.primary} />
          </TouchableOpacity>

          {/* 2. Community posts */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => showAlert('Community posts', 'TransitLK community updates & discussions.')}
            activeOpacity={0.75}
          >
            <Text style={styles.actionCardText}>Community posts</Text>
            <ChatBubbleIcon size={22} color={colors.teal.primary} />
          </TouchableOpacity>

          {/* 3. Conductor tools */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => showAlert('Conductor tools', 'Conductor scanner & fare validation tools.')}
            activeOpacity={0.75}
          >
            <Text style={styles.actionCardText}>Conductor tools</Text>
            <ScannerIcon size={22} color={colors.teal.primary} />
          </TouchableOpacity>

          {/* 4. Admin dashboard */}
          <TouchableOpacity
            style={styles.adminCard}
            onPress={handleOpenAdminModal}
            activeOpacity={0.75}
          >
            <View style={styles.adminCardRow}>
              <View style={styles.adminTitleRow}>
                <LockIcon size={16} color={colors.teal.primary} />
                <Text style={styles.adminCardText}>Admin dashboard</Text>
              </View>
              <View style={styles.adminLockBadge}>
                <Text style={styles.adminLockBadgeText}>Security Login</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign out link */}
        <TouchableOpacity
          onPress={onLogout}
          style={styles.signOutContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Administrator Security Verification Modal */}
      <Modal
        visible={showAdminModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!adminLoading) setShowAdminModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch Area to close modal on outside tap */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              if (!adminLoading) {
                Keyboard.dismiss();
                setShowAdminModal(false);
              }
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardContainer}
            pointerEvents="box-none"
          >
            <View style={styles.modalCard}>
              {/* Shield / Lock Badge Header */}
              <View style={styles.modalHeaderBadge}>
                <View style={styles.modalIconCircle}>
                  <LockIcon size={24} color={colors.teal.primary} />
                </View>
                <Text style={styles.modalKicker}>RESTRICTED ACCESS</Text>
                <Text style={styles.modalTitle}>Admin Verification</Text>
                <Text style={styles.modalSubtitle}>
                  Please confirm administrator credentials to open the TransitLK Admin Portal.
                </Text>
              </View>

              {/* Error Banner */}
              {adminError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>⚠️ {adminError}</Text>
                </View>
              ) : null}

              {/* Form fields */}
              <View style={styles.modalForm}>
                <InputField
                  label="Admin Username"
                  placeholder="Enter username"
                  value={adminUsername}
                  onChangeText={(val) => {
                    setAdminUsername(val);
                    if (adminError) setAdminError('');
                  }}
                  leftIcon={<UserIcon size={18} color={colors.teal.primary} />}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                />

                <InputField
                  label="Admin Password"
                  placeholder="Enter password"
                  value={adminPassword}
                  onChangeText={(val) => {
                    setAdminPassword(val);
                    if (adminError) setAdminError('');
                  }}
                  isPassword={true}
                  leftIcon={<LockIcon size={18} color={colors.teal.primary} />}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="none"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <AppButton
                  title={adminLoading ? 'Verifying Admin...' : 'Verify & Open Dashboard'}
                  onPress={handleAdminVerify}
                  variant="teal"
                  loading={adminLoading}
                  showArrow={!adminLoading}
                />

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    if (!adminLoading) setShowAdminModal(false);
                  }}
                  disabled={adminLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <HomeIcon size={22} color={activeTab === 'home' ? colors.teal.primary : colors.neutral.placeholder} />
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Tickets */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('tickets')}
          activeOpacity={0.7}
        >
          <TicketIcon size={22} color={activeTab === 'tickets' ? colors.teal.primary : colors.neutral.placeholder} />
          <Text style={[styles.tabLabel, activeTab === 'tickets' && styles.tabLabelActive]}>
            Tickets
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Community */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('community')}
          activeOpacity={0.7}
        >
          <ChatBubbleIcon size={22} color={activeTab === 'community' ? colors.teal.primary : colors.neutral.placeholder} />
          <Text style={[styles.tabLabel, activeTab === 'community' && styles.tabLabelActive]}>
            Community
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Profile (Active) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}
        >
          <View style={styles.activeTabPill}>
            <UserIcon size={19} color={colors.teal.primary} />
            <Text style={styles.activeTabLabel}>Profile</Text>
          </View>
        </TouchableOpacity>
      </View>
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
    paddingTop: 10,
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#DCF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.neutral.title,
    letterSpacing: -0.4,
  },
  accountSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral.muted,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral.label,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  languageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.neutral.inputBorder,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  languageText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.neutral.title,
    letterSpacing: -0.1,
  },
  actionsList: {
    gap: 12,
    marginBottom: 14,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.neutral.inputBorder,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.neutral.title,
    letterSpacing: -0.1,
  },
  adminCard: {
    height: 52,
    backgroundColor: '#DCF5EE',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  adminCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
  adminLockBadge: {
    backgroundColor: '#C5EDE0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminLockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: 0.2,
  },
  signOutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: -0.1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  modalKeyboardContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    zIndex: 1,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderBadge: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral.title,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.neutral.muted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  modalErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  modalErrorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
  },
  modalForm: {
    marginBottom: 8,
  },
  modalActions: {
    gap: 8,
    marginTop: 4,
  },
  modalCancelButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral.muted,
  },
  bottomTabBar: {
    height: 64,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral.placeholder,
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.teal.primary,
    fontWeight: '700',
  },
  activeTabPill: {
    backgroundColor: '#DCF5EE',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.teal.primary,
    marginTop: 2,
  },
});
