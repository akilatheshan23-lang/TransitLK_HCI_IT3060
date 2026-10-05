import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface RoleAccessBadgeProps {
  label: string;
  variant?: 'authority' | 'owner';
}

export const RoleAccessBadge: React.FC<RoleAccessBadgeProps> = ({
  label,
  variant = 'authority',
}) => {
  const isAuthority = variant === 'authority';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isAuthority
            ? colors.authority.badgeBg
            : colors.teal.light,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: isAuthority
              ? colors.authority.primary
              : colors.teal.primary,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 18,
    width: '100%',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
});
