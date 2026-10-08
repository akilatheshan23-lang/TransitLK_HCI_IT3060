import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeftIcon, BellIcon } from './Icons';
import { colors } from '../theme/colors';

interface HeaderProps {
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
  return (
    <View style={styles.container}>
      <View style={styles.leftGroup}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBackPress}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <ArrowLeftIcon size={22} color={colors.neutral.title} />
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
        >
          <BellIcon size={22} color={colors.neutral.title} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  backButton: {
    padding: 4,
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
    width: 28,
  },
});
