import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DeviceFrame } from './src/components/DeviceFrame';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { AuthorityLoginScreen } from './src/screens/AuthorityLoginScreen';
import { BusOwnerLoginScreen } from './src/screens/BusOwnerLoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import FleetTrackingScreen from './src/FleetTrackingScreen';
import TransitApp from './src/TransitApp';
import { api, UserProfile } from './src/services/api';

export type ScreenType =
  | 'home'
  | 'transit'
  | 'login'
  | 'register'
  | 'authority-login'
  | 'bus-owner-login'
  | 'dashboard'
  | 'fleet';

const defaultGuestUser: UserProfile = {
  id: 'guest',
  email: 'passenger@transitlk.com',
  name: 'Kamal Perera',
  role: 'passenger',
  language: 'en',
  status: 'approved',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (
        hash === 'register' ||
        hash === 'login' ||
        hash === 'authority-login' ||
        hash === 'bus-owner-login' ||
        hash === 'dashboard' ||
        hash === 'transit' ||
        hash === 'fleet' ||
        hash === 'home'
      ) {
        return hash as ScreenType;
      }
    }
    return 'home';
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
          hash === 'register' ||
          hash === 'login' ||
          hash === 'authority-login' ||
          hash === 'bus-owner-login' ||
          hash === 'dashboard' ||
          hash === 'transit' ||
          hash === 'fleet' ||
          hash === 'home'
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

  const activeUser = currentUser || defaultGuestUser;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'transit':
        return (
          <TransitApp
            user={activeUser as any}
            onWelcome={() => navigateTo('home')}
            onProfile={() => navigateTo(currentUser ? 'dashboard' : 'login')}
            onNotifications={() => {}}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onNavigateToRegister={() => navigateTo('register')}
            onNavigateToAuthority={() => navigateTo('authority-login')}
            onNavigateToBusOwner={() => navigateTo('bus-owner-login')}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              navigateTo(user.role === 'passenger' ? 'home' : 'dashboard');
            }}
          />
        );

      case 'register':
        return (
          <RegisterScreen
            onNavigateBack={() => navigateTo('login')}
            onRegisterSuccess={(user) => {
              setCurrentUser(user);
              navigateTo('home');
            }}
          />
        );

      case 'authority-login':
        return (
          <AuthorityLoginScreen
            onNavigateBack={() => navigateTo('login')}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              navigateTo('dashboard');
            }}
          />
        );

      case 'bus-owner-login':
        return (
          <BusOwnerLoginScreen
            onNavigateBack={() => navigateTo('login')}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              navigateTo('dashboard');
            }}
          />
        );

      case 'dashboard':
        return (
          <DashboardScreen
            user={activeUser}
            onLogout={() => {
              api.logout().finally(() => {
                setCurrentUser(null);
                navigateTo('login');
              });
            }}
            onNavigateBack={() => navigateTo('home')}
            onNavigateToHome={() => navigateTo('home')}
          />
        );

      case 'fleet':
        return (
          <FleetTrackingScreen
            onBack={() => navigateTo(currentUser?.role === 'bus_owner' ? 'dashboard' : 'home')}
          />
        );

      case 'home':
      default:
        return (
          <HomeScreen
            user={activeUser}
            onNavigateToProfile={() => navigateTo(currentUser ? 'dashboard' : 'login')}
            onNavigateBack={() => navigateTo('transit')}
            onNavigateToTransit={() => navigateTo('transit')}
            onNavigateToCommunity={() => navigateTo('transit')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <DeviceFrame>{renderScreen()}</DeviceFrame>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
