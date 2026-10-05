import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { DeviceFrame } from './src/components/DeviceFrame';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { AuthorityLoginScreen } from './src/screens/AuthorityLoginScreen';
import { BusOwnerLoginScreen } from './src/screens/BusOwnerLoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { colors } from './src/theme/colors';
import { api, UserProfile } from './src/services/api';

export type ScreenType =
  | 'login'
  | 'register'
  | 'authority-login'
  | 'bus-owner-login'
  | 'dashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (
        hash === 'register' ||
        hash === 'authority-login' ||
        hash === 'bus-owner-login' ||
        hash === 'dashboard'
      ) {
        return hash as ScreenType;
      }
    }
    return 'login';
  });

  // Check existing session on startup
  useEffect(() => {
    api.getSession().then(({ user }) => {
      if (user) {
        setCurrentUser(user);
      }
    });
  }, []);

  // Keep window.location.hash synchronized on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        if (
          hash === 'login' ||
          hash === 'register' ||
          hash === 'authority-login' ||
          hash === 'bus-owner-login' ||
          hash === 'dashboard'
        ) {
          setCurrentScreen(hash as ScreenType);
        }
      };

      window.addEventListener('hashchange', handleHashChange);
      return () => window.removeEventListener('hashchange', handleHashChange);
    }
  }, []);

  const navigateTo = (screen: ScreenType) => {
    setCurrentScreen(screen);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.hash = screen;
    }
  };

  const handleAuthenticated = (user: UserProfile) => {
    setCurrentUser(user);
    navigateTo('dashboard');
  };

  const handleLogout = async () => {
    const { token } = await api.getSession();
    await api.logout(token || undefined);
    setCurrentUser(null);
    navigateTo('login');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return (
          <LoginScreen
            onNavigateToRegister={() => navigateTo('register')}
            onNavigateToAuthority={() => navigateTo('authority-login')}
            onNavigateToBusOwner={() => navigateTo('bus-owner-login')}
            onLoginSuccess={handleAuthenticated}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onNavigateBack={() => navigateTo('login')}
            onRegisterSuccess={handleAuthenticated}
          />
        );
      case 'authority-login':
        return (
          <AuthorityLoginScreen
            onNavigateBack={() => navigateTo('login')}
            onLoginSuccess={handleAuthenticated}
          />
        );
      case 'bus-owner-login':
        return (
          <BusOwnerLoginScreen
            onNavigateBack={() => navigateTo('login')}
            onLoginSuccess={handleAuthenticated}
          />
        );
      case 'dashboard':
        return (
          <DashboardScreen
            user={
              currentUser || {
                id: 'demo-user',
                email: 'name@example.com',
                name: 'Kamal Perera',
                role: 'passenger',
              }
            }
            onLogout={handleLogout}
            onNavigateBack={() => navigateTo('login')}
          />
        );
      default:
        return null;
    }
  };

  const getScreenTitle = (screen: ScreenType) => {
    switch (screen) {
      case 'login':
        return '02 · Login';
      case 'register':
        return '03 · Create account';
      case 'authority-login':
        return '37 · Authority Officer';
      case 'bus-owner-login':
        return 'Bus Owner login';
      case 'dashboard':
        return 'My profile';
    }
  };

  return (
    <View style={styles.appContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Presentation / Prototype Toolbar */}
      {Platform.OS === 'web' && (
        <View style={styles.webHeaderBar}>
          <View style={styles.webHeaderLeft}>
            <View style={styles.brandDot} />
            <Text style={styles.webHeaderTitle}>Google Pixel 7 • TransitLK</Text>
            <Text style={styles.webHeaderBadge}>{getScreenTitle(currentScreen)}</Text>
            <View style={styles.dbIndicator}>
              <View style={styles.dbIndicatorDot} />
              <Text style={styles.dbIndicatorText}>MongoDB Live</Text>
            </View>
          </View>

          <View style={styles.tabButtonsGroup}>
            {(
              [
                ['login', '1. User Login'],
                ['register', '2. Create Account'],
                ['authority-login', '3. Authority Officer'],
                ['bus-owner-login', '4. Bus Owner'],
                ['dashboard', '5. My Profile'],
              ] as const
            ).map(([screenKey, label]) => {
              const active = currentScreen === screenKey;
              return (
                <TouchableOpacity
                  key={screenKey}
                  onPress={() => navigateTo(screenKey)}
                  style={[
                    styles.tabButton,
                    active && styles.tabButtonActive,
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabButtonText,
                      active && styles.tabButtonTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Mobile Device Viewport (Google Pixel 7) */}
      <View style={styles.phoneViewport}>
        <DeviceFrame
          networkText={currentScreen === 'authority-login' ? 'LTE' : '5G'}
        >
          {renderScreen()}
        </DeviceFrame>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#EDF2F7' : '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webHeaderBar: {
    width: '100%',
    maxWidth: 960,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexWrap: 'wrap',
    gap: 12,
  },
  webHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal.primary,
  },
  webHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.neutral.title,
    letterSpacing: -0.2,
  },
  webHeaderBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.teal.primary,
    backgroundColor: colors.teal.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dbIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  dbIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  dbIndicatorText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  tabButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: colors.teal.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral.muted,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  phoneViewport: {
    flex: 1,
    width: '100%',
    // Google Pixel 7 exact viewport dimensions: 412 x 915 dp
    maxWidth: Platform.OS === 'web' ? 412 : '100%',
    maxHeight: Platform.OS === 'web' ? 915 : '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 28 : 0,
    overflow: 'hidden',
    shadowColor: '#0A1C2E',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: Platform.OS === 'web' ? 0.14 : 0,
    shadowRadius: 36,
    elevation: Platform.OS === 'web' ? 8 : 0,
    borderWidth: Platform.OS === 'web' ? 6 : 0,
    borderColor: '#1E232A',
    marginBottom: Platform.OS === 'web' ? 14 : 0,
  },
});
