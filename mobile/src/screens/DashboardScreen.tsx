import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Header } from '../components/Header';
import {
  UserIcon,
  GlobeIcon,
  TicketIcon,
  ChatBubbleIcon,
  ScannerIcon,
  HomeIcon,
} from '../components/Icons';
import { colors } from '../theme/colors';
import { UserProfile } from '../services/api';

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
            onPress={() => showAlert('Admin dashboard', `Accessing TransitLK portal for ${user.email} (MongoDB Atlas).`)}
            activeOpacity={0.75}
          >
            <Text style={styles.adminCardText}>Admin dashboard</Text>
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
    height: 50,
    backgroundColor: '#DCF5EE',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  adminCardText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.teal.primary,
    letterSpacing: -0.1,
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
