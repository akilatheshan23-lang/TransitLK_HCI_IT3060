import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  StatusBar,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceFrame } from './src/components/DeviceFrame';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { AuthorityLoginScreen } from './src/screens/AuthorityLoginScreen';
import { BusOwnerLoginScreen } from './src/screens/BusOwnerLoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import OwnerDashboard from './src/OwnerDashboard';
import AuthorityDashboardScreen from './src/authority/AuthorityDashboardScreen';
import FleetTrackingScreen from './src/FleetTrackingScreen';
import TransitApp from './src/TransitApp';
import AppNavigator from './src/navigation/AppNavigator';
import { api, UserProfile, BusSearchResult } from './src/services/api';

export type ScreenType =
  | 'home'
  | 'transit'
  | 'community'
  | 'staff-management'
  | 'login'
  | 'register'
  | 'authority-login'
  | 'bus-owner-login'
  | 'dashboard'
  | 'fleet'
  | 'payment'
  | 'tickets'
  | 'conductor';

export const AppNavigationContext = React.createContext<{
  navigateToScreen: (screen: ScreenType) => void;
}>({
  navigateToScreen: () => {},
});

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
        hash === 'transit' || hash === 'community' || hash === 'staff-management' ||
        hash === 'fleet' ||
        hash === 'home' ||
        hash === 'payment' ||
        hash === 'tickets' ||
        hash === 'conductor'
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
          hash === 'transit' || hash === 'community' || hash === 'staff-management' ||
          hash === 'fleet' ||
          hash === 'home' ||
          hash === 'payment' ||
          hash === 'tickets' ||
          hash === 'conductor'
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

  const handleSelectBusAndPay = async (bus?: BusSearchResult) => {
    if (bus) {
      const pendingTicket = {
        id: String(bus.id || bus.busRegNumber),
        bus: bus.busRegNumber,
        type: `${bus.busType || 'Standard'} service`,
        from: bus.fromStop,
        fromTime: bus.departureTime,
        to: bus.toStop,
        toTime: bus.arrivalTime || '--:--',
        price: bus.fare || 250,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };
      try {
        await AsyncStorage.setItem('@pending_ticket', JSON.stringify(pendingTicket));
      } catch {
        // Continue with navigation even if local storage fails
      }
    }
    navigateTo('payment');
  };

  const activeUser = currentUser || defaultGuestUser;

  const renderScreen = () => {
    switch (currentScreen) {
      case 'community':
      case 'transit':
        return (
          <TransitApp key={currentScreen} initialPage={currentScreen === 'community' ? 'community' : 'home'}
            user={currentUser as any}
            onWelcome={() => navigateTo('home')}
            onProfile={() => navigateTo(currentUser ? 'dashboard' : 'login')}
            onNotifications={() => {}}
            onBuyTicket={async (ticket) => {
              try {
                await AsyncStorage.setItem('@pending_ticket', JSON.stringify(ticket));
              } catch {}
              navigateTo('payment');
            }}
            onTickets={() => navigateTo('tickets')}
          />
        );

      case 'payment':
        return (
          <NavigationContainer>
            <AppNavigator initialRouteName="PaymentCheckout" onBackToHome={() => navigateTo('transit')} />
          </NavigationContainer>
        );

      case 'tickets':
        return (
          <NavigationContainer>
            <AppNavigator initialRouteName="SavedTickets" onBackToHome={() => navigateTo('transit')} />
          </NavigationContainer>
        );

      case 'conductor':
        // Guard unauthorized users from accessing conductor screen
        if (!currentUser || (currentUser.role !== 'conductor' && currentUser.role !== 'admin')) {
          if (!currentUser) {
            return (
              <LoginScreen
                onNavigateToRegister={() => navigateTo('register')}
                onNavigateToAuthority={() => navigateTo('authority-login')}
                onNavigateToBusOwner={() => navigateTo('bus-owner-login')}
                onLoginSuccess={(user) => {
                  setCurrentUser(user);
                  if (user.role === 'conductor') {
                    navigateTo('conductor');
                  } else if (['owner', 'bus_owner', 'officer', 'authority', 'admin'].includes(user.role)) {
                    navigateTo('dashboard');
                  } else {
                    navigateTo('home');
                  }
                }}
              />
            );
          }
          if (currentUser.role === 'passenger') {
            return (
              <HomeScreen
                user={activeUser}
                onNavigateToProfile={() => navigateTo('dashboard')}
                onNavigateBack={() => navigateTo('transit')}
                onNavigateToTransit={() => navigateTo('transit')}
                onNavigateToCommunity={() => navigateTo('community')}
                onNavigateToPayment={handleSelectBusAndPay}
                onNavigateToTickets={() => navigateTo('tickets')}
                onNavigateToConductor={() => navigateTo('conductor')}
              />
            );
          }
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
        }
        return (
          <NavigationContainer>
            <AppNavigator initialRouteName="ConductorDashboard" onBackToHome={() => navigateTo('dashboard')} />
          </NavigationContainer>
        );

      case 'login':
        return (
          <LoginScreen
            onNavigateToRegister={() => navigateTo('register')}
            onNavigateToAuthority={() => navigateTo('authority-login')}
            onNavigateToBusOwner={() => navigateTo('bus-owner-login')}
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              if (user.role === 'conductor') {
                navigateTo('conductor');
              } else if (['owner', 'bus_owner', 'officer', 'authority', 'admin'].includes(user.role)) {
                navigateTo('dashboard');
              } else {
                navigateTo('home');
              }
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
        if (currentUser && ['officer', 'authority'].includes(currentUser.role)) {
          return <AuthorityDashboardScreen user={currentUser as any} onOpenWebDashboard={() => navigateTo('staff-management')} onBack={() => navigateTo('home')} onSignOut={() => { void api.logout().then(() => { setCurrentUser(null); navigateTo('login'); }); }} />;
        }
        if (currentUser && ['owner', 'bus_owner'].includes(currentUser.role)) {
          return <OwnerDashboard user={currentUser as any} onOpenWebDashboard={() => navigateTo('staff-management')} onViewFleet={() => navigateTo('fleet')} onBack={() => navigateTo('home')} onSignOut={() => { void api.logout().then(() => { setCurrentUser(null); navigateTo('login'); }); }} />;
        }
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

      case 'staff-management':
        return <DashboardScreen user={activeUser} onLogout={() => { void api.logout().then(() => { setCurrentUser(null); navigateTo('login'); }); }} onNavigateBack={() => navigateTo('dashboard')} onNavigateToHome={() => navigateTo('home')} />;
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
            onNavigateToCommunity={() => navigateTo('community')}
            onNavigateToPayment={handleSelectBusAndPay}
            onNavigateToTickets={() => navigateTo('tickets')}
            onNavigateToConductor={() => navigateTo('conductor')}
          />
        );
    }
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppNavigationContext.Provider value={{ navigateToScreen: navigateTo }}>
        <DeviceFrame>{renderScreen()}</DeviceFrame>
      </AppNavigationContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
