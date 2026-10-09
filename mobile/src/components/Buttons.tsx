import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { ArrowRightIcon } from './Icons';
import { colors } from '../theme/colors';
import { platformShadow } from '../theme/shadows';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'teal' | 'authority' | 'google' | 'ghost';
  showArrow?: boolean;
  arrowColor?: string;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export const AppButton: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'teal',
  showArrow = false,
  arrowColor,
  loading = false,
  disabled = false,
  style,
}) => {
  const isGoogle = variant === 'google';
  const isAuthority = variant === 'authority';
  const isGhost = variant === 'ghost';

  const getBackgroundColor = () => {
    if (disabled) return '#CBD5E1';
    if (isGoogle || isGhost) return '#FFFFFF';
    if (isAuthority) return colors.authority.primary;
    return colors.teal.primary;
  };

  const getTextColor = () => {
    if (disabled) return '#64748B';
    if (isGoogle) return colors.neutral.title;
    if (isGhost) return colors.teal.primary;
    return '#FFFFFF';
  };

  const defaultArrowColor = isGoogle
    ? colors.teal.primary
    : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        isGoogle && styles.googleBorder,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isGoogle ? colors.teal.primary : '#FFFFFF'}
        />
      ) : (
        <View style={[styles.innerRow, showArrow && styles.innerRowSpread]}>
          <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
          {showArrow && (
            <ArrowRightIcon
              size={20}
              color={arrowColor || defaultArrowColor}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
    ...platformShadow({ color: '#000', width: 0, height: 2, opacity: 0.04, radius: 4, elevation: 1 }),
  },
  googleBorder: {
    borderWidth: 1.2,
    borderColor: colors.neutral.inputBorder,
  },
  innerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  innerRowSpread: {
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
