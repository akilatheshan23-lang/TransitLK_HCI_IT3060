import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { ArrowLeftIcon, BellIcon } from './Icons';
import { colors } from '../theme/colors';
import { platformShadow } from '../theme/shadows';

export interface HeaderProps {
  title: string;
  onBackPress?: () => void;
  showBack?: boolean;
  showBell?: boolean;
  onBellPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onBackPress,
  showBack = true,
  showBell = false,
  onBellPress,
}) => {
  let nav: any = null;
  try {
    nav = useNavigation();
  } catch {
    // Navigation container may not wrap this screen in standalone mode
  }

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (nav && typeof nav.goBack === 'function' && nav.canGoBack?.()) {
      nav.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            {/* Render modern chevron back */}
            <Ionicons name="chevron-back" size={24} color={colors.neutral.title} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {showBell ? (
        <TouchableOpacity
          onPress={onBellPress}
          style={styles.bellButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <BellIcon size={22} color={colors.neutral.title} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backButton: {
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    ...platformShadow({ color: '#000', width: 0, height: 1, opacity: 0.05, radius: 2, elevation: 1 }),
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral.title,
    letterSpacing: -0.2,
  },
  bellButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 32,
  },
});
