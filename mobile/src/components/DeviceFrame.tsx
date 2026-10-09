import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth > 480;

  const [timeStr, setTimeStr] = useState('9:30');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const phoneHeight = isDesktop
    ? Math.min(880, Math.max(680, windowHeight - 36))
    : '100%';

  return (
    <View style={isDesktop ? styles.desktopStage : styles.mobileStage}>
      {/* Google Pixel 7 Device Chassis */}
      <View
        style={[
          styles.chassisBase,
          isDesktop && styles.desktopChassis,
          isDesktop && { height: phoneHeight },
        ]}
      >
        {/* Physical hardware side buttons (Pixel 7 style on desktop) */}
        {isDesktop && (
          <>
            <View style={styles.powerButton} />
            <View style={styles.volumeButton} />
          </>
        )}

        {/* Inner OLED display container */}
        <View style={[styles.screenBase, isDesktop && styles.desktopScreen]}>
          {/* Top Speaker Ear-piece */}
          {isDesktop && <View style={styles.speakerGrill} />}

          {/* Google Pixel 7 Status Bar */}
          {showStatusBar && (
            <View style={styles.statusBar}>
              {/* Left: Dynamic Time */}
              <View style={styles.timeLeft}>
                <Text style={styles.timeText}>{timeStr}</Text>
              </View>

              {/* Center: Pixel 7 Centered Camera Punch-Hole */}
              <View style={styles.punchHoleWrapper}>
                <View style={styles.cameraPunchHole}>
                  <View style={styles.cameraLensInner} />
                </View>
              </View>

              {/* Right: Android Status Icons (5G, Signal, Wifi, Battery) */}
              <View style={styles.statusIconsRight}>
                {networkText ? (
                  <Text style={styles.networkBadgeText}>{networkText}</Text>
                ) : null}

                {/* Android Signal Triangle */}
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M2 22h20V2L2 22z" fill="#0F172A" />
                </Svg>

                {/* Android Wi-Fi Icon */}
                <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"
                    fill="#0F172A"
                  />
                </Svg>

                {/* Android Battery Icon */}
                <Svg width={17} height={13} viewBox="0 0 24 14" fill="none">
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

          {/* Screen Content - Pure White Mobile Display */}
          <View style={styles.contentContainer}>{children}</View>

          {/* Android Gesture Navigation Bar (Pixel 7 pill) */}
          <View style={styles.navBarWrapper}>
            <View style={styles.gestureIndicator} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  desktopStage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  mobileStage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  chassisBase: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    position: 'relative',
    alignSelf: 'center',
  },
  desktopChassis: {
    width: 412,
    maxWidth: 412,
    backgroundColor: '#1E293B',
    borderRadius: 48,
    padding: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
      } as any,
    }),
  },
  screenBase: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
  },
  desktopScreen: {
    borderRadius: 38,
  },
  speakerGrill: {
    position: 'absolute',
    top: 3,
    left: '50%',
    marginLeft: -26,
    width: 52,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#334155',
    zIndex: 30,
  },
  powerButton: {
    position: 'absolute',
    right: -4,
    top: 130,
    width: 4,
    height: 36,
    backgroundColor: '#475569',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  volumeButton: {
    position: 'absolute',
    right: -4,
    top: 185,
    width: 4,
    height: 70,
    backgroundColor: '#475569',
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  statusBar: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  timeLeft: {
    width: 60,
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 13,
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
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cameraLensInner: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    backgroundColor: '#0F1E36',
  },
  statusIconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    position: 'relative',
  },
  navBarWrapper: {
    height: 22,
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
