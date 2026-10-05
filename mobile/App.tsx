import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';

const WebDeviceFrame = ({ children }: { children: React.ReactNode }) => {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.webRoot}>
      <View style={styles.phoneBezel}>
        <View style={styles.phoneScreen}>
          <View style={styles.statusBar}>
            <Text style={styles.timeText}>{currentTime}</Text>
            <View style={styles.cameraHole} />
            <View style={styles.statusIcons}>
              <Ionicons name="cellular" size={14} color="#000" style={{ marginRight: 4 }} />
              <Ionicons name="wifi" size={14} color="#000" style={{ marginRight: 4 }} />
              <Ionicons name="battery-full" size={16} color="#000" />
            </View>
          </View>
          {children}
          <View style={styles.homeIndicatorContainer}>
            <View style={styles.homeIndicator} />
          </View>
        </View>
      </View>
    </View>
  );
};

const linking = {
  prefixes: ['http://localhost:8081', 'transitlk://'],
  config: {
    screens: {
      PaymentCheckout: '',
      ConductorDashboard: 'conductor',
      ScanTicket: 'conductor/scan',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider style={styles.provider}>
      <WebDeviceFrame>
        <NavigationContainer linking={linking}>
          <AppNavigator />
        </NavigationContainer>
      </WebDeviceFrame>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#f1f5f9' : '#fff',
  },
  webRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#f1f5f9',
  },
  phoneBezel: {
    width: 412,
    height: 892,
    backgroundColor: '#1e293b',
    borderRadius: 40,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 20,
  },
  phoneScreen: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
  },
  cameraHole: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    position: 'absolute',
    left: '50%',
    marginLeft: -8,
    top: 14,
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  homeIndicator: {
    width: 100,
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
  },
});

