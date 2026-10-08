import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { colors } from '../theme/colors';

interface DeviceFrameProps {
  children: React.ReactNode;
  networkText?: 'LTE' | '5G' | 'WIFI';
  showStatusBar?: boolean;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  networkText = '5G',
  showStatusBar = true,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Google Pixel 7 Status Bar */}
        {showStatusBar && (
          <View style={styles.statusBar}>
            {/* Left: Time (Pixel 7 style) */}
            <View style={styles.timeLeft}>
              <Text style={styles.timeText}>9:30</Text>
            </View>

            {/* Center: Pixel 7 Punch-Hole Camera */}
            <View style={styles.punchHoleWrapper}>
              <View style={styles.cameraPunchHole}>
                <View style={styles.cameraLensInner} />
              </View>
            </View>

            {/* Right: Android Status Icons (5G / LTE, Signal, Wifi, Battery) */}
            <View style={styles.statusIconsRight}>
              {networkText && (
                <Text style={styles.networkBadgeText}>{networkText}</Text>
              )}

              {/* Android Cellular Triangle Icon */}
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M2 22h20V2L2 22z"
                  fill="#0F172A"
                />
              </Svg>

              {/* Android Wi-Fi Icon */}
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"
                  fill="#0F172A"
                />
              </Svg>

              {/* Android Battery Icon */}
              <Svg width={18} height={14} viewBox="0 0 24 14" fill="none">
                <Rect
                  x={1}
                  y={1}
                  width={19}
                  height={12}
                  rx={3}
                  stroke="#0F172A"
                  strokeWidth={1.8}
                />
                <Rect x={3} y={3} width={13} height={8} rx={1.5} fill="#0F172A" />
                <Path
                  d="M22 4.5v5"
                  stroke="#0F172A"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>
        )}

        {/* Screen Content */}
        <View style={styles.contentContainer}>{children}</View>

        {/* Android Gesture Navigation Bar (Pixel 7 pill) */}
        <View style={styles.navBarWrapper}>
          <View style={styles.gestureIndicator} />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  outerContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    // Pixel 7 logical viewport: 412 x 915 dp
    maxWidth: Platform.OS === 'web' ? 412 : '100%',
    width: '100%',
    alignSelf: 'center',
  },
  statusBar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  timeLeft: {
    width: 60,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral.title,
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'sans-serif',
    letterSpacing: 0.1,
  },
  punchHoleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPunchHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cameraLensInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0F1E36',
  },
  statusIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
    width: 85,
  },
  networkBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.neutral.title,
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'sans-serif',
  },
  contentContainer: {
    flex: 1,
  },
  navBarWrapper: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  gestureIndicator: {
    width: 72,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0F172A',
  },
});
