import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BusPictogram } from './Icons';
import { colors } from '../theme/colors';
import { platformShadow } from '../theme/shadows';

interface TransitLogoProps {
  size?: 'normal' | 'large';
}

export const TransitLogo: React.FC<TransitLogoProps> = ({ size = 'normal' }) => {
  const isLarge = size === 'large';

  return (
    <View style={styles.container}>
      <View style={[styles.badge, isLarge && styles.badgeLarge]}>
        <BusPictogram size={isLarge ? 28 : 22} color="#FFFFFF" />
      </View>
      <Text style={[styles.title, isLarge && styles.titleLarge]}>TransitLK</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.teal.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...platformShadow({ color: colors.teal.primary, width: 0, height: 4, opacity: 0.15, radius: 8, elevation: 3 }),
  },
  badgeLarge: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.neutral.title,
    letterSpacing: -0.5,
  },
  titleLarge: {
    fontSize: 26,
  },
});
