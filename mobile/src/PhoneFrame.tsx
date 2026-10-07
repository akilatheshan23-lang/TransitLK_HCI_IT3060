import React from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors as c } from './theme';

/* Official Android / Google Pixel signal triangle (M2 22h20V2L2 22z) */
function PixelSignalIcon({ color = '#1E293B', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 22h20V2L2 22z" fill={color} />
    </Svg>
  );
}

/* Official Android / Google Pixel Wi-Fi fan */
function PixelWifiIcon({ color = '#1E293B', size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <Path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <Circle cx="12" cy="20" r="1.3" fill={color} />
    </Svg>
  );
}

/* Official Android / Google Pixel Battery capsule */
function PixelBatteryIcon({ color = '#1E293B' }: { color?: string }) {
  return (
    <View style={s.batteryWrap}>
      <View style={[s.batteryBody, { borderColor: color }]}>
        <View style={[s.batteryFill, { backgroundColor: color }]} />
      </View>
      <View style={[s.batteryTip, { backgroundColor: color }]} />
    </View>
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWebDesktop = Platform.OS === 'web' && width >= 480;

  if (!isWebDesktop) {
    return <View style={s.nativeContainer}>{children}</View>;
  }

  return (
    <View style={s.stage}>
      {/* Google Pixel 7 Phone Chassis */}
      <View style={s.pixelChassis}>
        {/* Pixel 7 Top Speaker Slit */}
        <View style={s.speakerSlit} />

        {/* Pixel 7 Right-Side Hardware Buttons */}
        <View style={s.pixelPowerButton} />
        <View style={s.pixelVolumeRocker} />

        {/* Pixel 7 Antenna Bands */}
        <View style={s.antennaTopLeft} />
        <View style={s.antennaTopRight} />
        <View style={s.antennaBottomLeft} />
        <View style={s.antennaBottomRight} />

        {/* Pixel 7 Display Screen */}
        <View style={s.pixelScreen}>
          {/* Pixel 7 Android Status Bar with centered punch-hole camera */}
          <View style={s.statusBar}>
            <Text style={s.statusTime}>9:30</Text>

            {/* Pixel 7 Punch-Hole Camera */}
            <View style={s.cameraCutout}>
              <View style={s.cameraLensRing}>
                <View style={s.cameraLensFlare} />
              </View>
            </View>

            {/* Pixel 7 Android System Icons */}
            <View style={s.statusRight}>
              <Text style={s.status5G}>5G</Text>
              <PixelSignalIcon size={14} color="#1E293B" />
              <PixelWifiIcon size={14} color="#1E293B" />
              <PixelBatteryIcon color="#1E293B" />
            </View>
          </View>

          {/* 100% Scale Mobile App Body Content */}
          <View style={s.appBody}>
            {children}
          </View>

          {/* Pixel 7 Android Gesture Navigation Pill */}
          <View style={s.navBarArea}>
            <View style={s.gesturePill} />
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  nativeContainer: {
    flex: 1,
    width: '100%',
  },
  stage: {
    flex: 1,
    width: '100%',
    height: '100vh' as any,
    maxHeight: '100vh' as any,
    backgroundColor: '#E7ECF0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    overflow: 'hidden',
  },
  /* Google Pixel 7 Chassis */
  pixelChassis: {
    width: 420,
    maxWidth: '96vw' as any,
    height: 'calc(100vh - 24px)' as any,
    maxHeight: 915,
    backgroundColor: '#1E2228',
    borderRadius: 42,
    padding: 6,
    position: 'relative',
    borderWidth: 2,
    borderColor: '#2D323B',
    boxShadow: '0 20px 50px -10px rgba(15,23,42,0.35), 0 0 0 1px rgba(0,0,0,0.15)' as any,
    display: 'flex',
    flexDirection: 'column',
  },
  speakerSlit: {
    position: 'absolute',
    top: 2,
    left: '50%' as any,
    transform: [{ translateX: -24 }] as any,
    width: 48,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#101317',
    zIndex: 20,
  },
  pixelPowerButton: {
    position: 'absolute',
    right: -7,
    top: 110,
    width: 5,
    height: 34,
    borderRadius: 2.5,
    backgroundColor: '#303640',
    borderLeftWidth: 1,
    borderLeftColor: '#1A1E24',
  },
  pixelVolumeRocker: {
    position: 'absolute',
    right: -7,
    top: 165,
    width: 5,
    height: 72,
    borderRadius: 2.5,
    backgroundColor: '#303640',
    borderLeftWidth: 1,
    borderLeftColor: '#1A1E24',
  },
  antennaTopLeft: {
    position: 'absolute',
    left: -2,
    top: 50,
    width: 4,
    height: 2,
    backgroundColor: '#121519',
  },
  antennaTopRight: {
    position: 'absolute',
    right: -2,
    top: 50,
    width: 4,
    height: 2,
    backgroundColor: '#121519',
  },
  antennaBottomLeft: {
    position: 'absolute',
    left: -2,
    bottom: 50,
    width: 4,
    height: 2,
    backgroundColor: '#121519',
  },
  antennaBottomRight: {
    position: 'absolute',
    right: -2,
    bottom: 50,
    width: 4,
    height: 2,
    backgroundColor: '#121519',
  },
  /* Display Screen takes 100% flex height of chassis */
  pixelScreen: {
    flex: 1,
    width: '100%',
    backgroundColor: c.background,
    borderRadius: 36,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  statusBar: {
    height: 36,
    paddingHorizontal: 20,
    backgroundColor: c.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  statusTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    minWidth: 42,
    letterSpacing: -0.2,
  },
  cameraCutout: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0A0C0F',
    borderWidth: 1.5,
    borderColor: '#1D2128',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraLensRing: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#0F1622',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    padding: 1,
  },
  cameraLensFlare: {
    width: 2.2,
    height: 2.2,
    borderRadius: 1.1,
    backgroundColor: '#2E5077',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 42,
    justifyContent: 'flex-end',
  },
  status5G: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
    marginRight: -3,
  },
  batteryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batteryBody: {
    width: 19,
    height: 11,
    borderRadius: 2.5,
    borderWidth: 1.5,
    padding: 1.2,
    justifyContent: 'center',
  },
  batteryFill: {
    width: '82%',
    height: '100%',
    borderRadius: 1,
  },
  batteryTip: {
    width: 1.5,
    height: 4,
    borderTopRightRadius: 1,
    borderBottomRightRadius: 1,
  },
  appBody: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  navBarArea: {
    height: 18,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gesturePill: {
    width: 105,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1E293B',
  },
});
