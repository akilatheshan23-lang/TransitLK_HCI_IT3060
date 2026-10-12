import {openPortal} from '../portalLinks';
import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
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
  EditIcon,
  TrashIcon,
  BusPictogram,
  TrainIcon,
  CheckIcon,
} from '../components/Icons';
import { InputField } from '../components/InputField';
import { AppButton } from '../components/Buttons';
import { colors } from '../theme/colors';
import { platformShadow } from '../theme/shadows';
import { UserProfile, api } from '../services/api';

interface DashboardScreenProps {
  user: UserProfile;
  onLogout: () => void;
  onNavigateBack?: () => void;
  onNavigateToHome?: () => void;
  onUpdateUser?: (user: UserProfile) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  onLogout,
  onNavigateBack,
  onNavigateToHome,
  onUpdateUser,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('English / Sinhala / Tamil');
  const [activeTab, setActiveTab] = useState<'home' | 'tickets' | 'community' | 'profile'>('profile');

  // Admin Verification Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Current User State
  const [currentUserState, setCurrentUserState] = useState<UserProfile>(user);

  useEffect(() => {
    setCurrentUserState(user);
  }, [user]);

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user.name || '');
  const [editEmail, setEditEmail] = useState(user.email || '');
  const [editAvatar, setEditAvatar] = useState(user.avatar || 'user');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const AVATAR_OPTIONS = [
    { key: 'user', label: 'Default' },
    { key: 'bus', label: 'Bus' },
    { key: 'train', label: 'Train' },
    { key: 'globe', label: 'Traveler' },
    { key: 'ticket', label: 'Pass' },
  ];

  const renderAvatarIcon = (avatarKey?: string, size = 42, color = colors.teal.primary) => {
    switch (avatarKey) {
      case 'bus':
        return <BusPictogram size={size} color={color} />;
      case 'train':
        return <TrainIcon size={size} color={color} />;
      case 'globe':
        return <GlobeIcon size={size} color={color} />;
      case 'ticket':
        return <TicketIcon size={size} color={color} />;
      case 'user':
      default:
        return <UserIcon size={size} color={color} />;
    }
  };

  const handleOpenEditModal = () => {
    setEditName(currentUserState.name || '');
    setEditEmail(currentUserState.email || '');
    setEditAvatar(currentUserState.avatar || 'user');
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName) {
      setEditError('Name cannot be empty.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setEditError('Please enter a valid email address.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    try {
      const res = await api.updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        avatar: editAvatar,
      });

      setEditLoading(false);

      if (res.success && res.user) {
        setCurrentUserState(res.user);
        onUpdateUser?.(res.user);
        setShowEditModal(false);
        showAlert('Profile Updated', 'Your profile details have been saved successfully.');
      } else {
        setEditError(res.message || 'Failed to update profile.');
      }
    } catch (err: any) {
      setEditLoading(false);
      setEditError(err.message || 'Network error while updating profile.');
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const res = await api.deleteAccount();
      setDeleteLoading(false);
      setShowDeleteModal(false);

      if (res.success) {
        showAlert('Account Deleted', 'Your account has been permanently removed from TransitLK.');
        onLogout();
      } else {
        showAlert('Delete Failed', res.message || 'Could not delete account. Please try again.');
      }
    } catch (err: any) {
      setDeleteLoading(false);
      setShowDeleteModal(false);
      showAlert('Error', err.message || 'Could not delete account.');
    }
  };

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

        await openPortal('admin');
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
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={handleOpenEditModal}
            activeOpacity={0.8}
          >
            {renderAvatarIcon(currentUserState.avatar, 42, colors.teal.primary)}
            <View style={styles.avatarEditBadge}>
              <EditIcon size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{currentUserState.name || 'Kamal Perera'}</Text>
          <Text style={styles.accountSubtitle}>{getAccountLabel()}</Text>
          <TouchableOpacity
            style={styles.editProfilePill}
            onPress={handleOpenEditModal}
            activeOpacity={0.75}
          >
            <EditIcon size={13} color={colors.teal.primary} />
            <Text style={styles.editProfilePillText}>Edit profile</Text>
          </TouchableOpacity>
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

        {/* Delete account button */}
        <TouchableOpacity
          onPress={() => setShowDeleteModal(true)}
          style={styles.deleteAccountContainer}
          activeOpacity={0.7}
        >
          <TrashIcon size={15} color="#DC2626" />
          <Text style={styles.deleteAccountText}>Delete account</Text>
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

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!editLoading) setShowEditModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              if (!editLoading) {
                Keyboard.dismiss();
                setShowEditModal(false);
              }
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardContainer}
            pointerEvents="box-none"
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderBadge}>
                <View style={styles.modalIconCircle}>
                  <EditIcon size={24} color={colors.teal.primary} />
                </View>
                <Text style={styles.modalKicker}>ACCOUNT SETTINGS</Text>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <Text style={styles.modalSubtitle}>
                  Update your display name, contact email and profile avatar.
                </Text>
              </View>

              {/* Avatar Selection */}
              <View style={styles.avatarPickerSection}>
                <Text style={styles.avatarPickerLabel}>Choose Avatar Icon</Text>
                <View style={styles.avatarOptionsRow}>
                  {AVATAR_OPTIONS.map((item) => {
                    const isSelected = editAvatar === item.key;
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.avatarOptionItem,
                          isSelected && styles.avatarOptionItemSelected,
                        ]}
                        onPress={() => setEditAvatar(item.key)}
                        activeOpacity={0.7}
                      >
                        {renderAvatarIcon(item.key, 22, isSelected ? colors.teal.primary : colors.neutral.muted)}
                        <Text
                          style={[
                            styles.avatarOptionText,
                            isSelected && styles.avatarOptionTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Error Banner */}
              {editError ? (
                <View style={styles.modalErrorBanner}>
                  <Text style={styles.modalErrorText}>⚠️ {editError}</Text>
                </View>
              ) : null}

              {/* Input Fields */}
              <View style={styles.modalForm}>
                <InputField
                  label="Full Name"
                  placeholder="Enter your name"
                  value={editName}
                  onChangeText={(val) => {
                    setEditName(val);
                    if (editError) setEditError('');
                  }}
                  leftIcon={<UserIcon size={18} color={colors.teal.primary} />}
                  autoCapitalize="words"
                />

                <InputField
                  label="Email Address"
                  placeholder="Enter your email"
                  value={editEmail}
                  onChangeText={(val) => {
                    setEditEmail(val);
                    if (editError) setEditError('');
                  }}
                  leftIcon={<GlobeIcon size={18} color={colors.teal.primary} />}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <AppButton
                  title={editLoading ? 'Saving Changes...' : 'Save Profile Changes'}
                  onPress={handleSaveProfile}
                  variant="teal"
                  loading={editLoading}
                  showArrow={!editLoading}
                />

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    if (!editLoading) setShowEditModal(false);
                  }}
                  disabled={editLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!deleteLoading) setShowDeleteModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              if (!deleteLoading) setShowDeleteModal(false);
            }}
          />

          <View style={styles.modalKeyboardContainer}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderBadge}>
                <View style={[styles.modalIconCircle, { backgroundColor: '#FEE2E2' }]}>
                  <TrashIcon size={24} color="#DC2626" />
                </View>
                <Text style={[styles.modalKicker, { color: '#DC2626' }]}>DANGER ZONE</Text>
                <Text style={styles.modalTitle}>Delete Account?</Text>
                <Text style={styles.modalSubtitle}>
                  Are you sure you want to permanently delete your TransitLK passenger account? This action cannot be undone. All tickets and profile data will be permanently removed from the system.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.deleteConfirmBtn, deleteLoading && { opacity: 0.7 }]}
                  onPress={handleConfirmDeleteAccount}
                  disabled={deleteLoading}
                  activeOpacity={0.8}
                >
                  {deleteLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <TrashIcon size={18} color="#FFFFFF" />
                      <Text style={styles.deleteConfirmBtnText}>Yes, Delete My Account</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    if (!deleteLoading) setShowDeleteModal(false);
                  }}
                  disabled={deleteLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Keep Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            if (onNavigateToHome) {
              onNavigateToHome();
            } else {
              setActiveTab('home');
            }
          }}
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
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
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
  editProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCF5EE',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 8,
  },
  editProfilePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.teal.primary,
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
    ...platformShadow({ color: '#000', width: 0, height: 1, opacity: 0.03, radius: 2, elevation: 1 }),
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
    ...platformShadow({ color: '#000', width: 0, height: 1, opacity: 0.03, radius: 2, elevation: 1 }),
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
  deleteAccountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 2,
    marginBottom: 8,
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
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
    ...platformShadow({ color: '#000', width: 0, height: 10, opacity: 0.16, radius: 20, elevation: 10 }),
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
  avatarPickerSection: {
    marginBottom: 14,
  },
  avatarPickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.label,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  avatarOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  avatarOptionItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neutral.inputBorder,
    backgroundColor: '#F8FAFC',
  },
  avatarOptionItemSelected: {
    borderColor: colors.teal.primary,
    backgroundColor: '#DCF5EE',
  },
  avatarOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral.muted,
    marginTop: 4,
  },
  avatarOptionTextSelected: {
    color: colors.teal.primary,
    fontWeight: '700',
  },
  deleteConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: '#DC2626',
    borderRadius: 14,
  },
  deleteConfirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
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
