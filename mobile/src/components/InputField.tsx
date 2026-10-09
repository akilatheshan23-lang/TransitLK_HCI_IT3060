import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { EyeIcon, EyeOffIcon } from './Icons';
import { colors } from '../theme/colors';
import { platformShadow } from '../theme/shadows';

interface InputFieldProps extends TextInputProps {
  label: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
  accentColor?: string;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  leftIcon,
  isPassword = false,
  accentColor = colors.teal.primary,
  error,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && { borderColor: accentColor, borderWidth: 1.5 },
          Boolean(error) && { borderColor: colors.status.error },
        ]}
      >
        {leftIcon && <View style={styles.iconWrapper}>{leftIcon}</View>}

        <TextInput
          style={styles.textInput}
          placeholderTextColor={colors.neutral.placeholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          {...textInputProps}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOffIcon size={20} color={colors.neutral.muted} />
            ) : (
              <EyeIcon size={20} color={colors.neutral.muted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral.label,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: colors.neutral.inputBg,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: colors.neutral.inputBorder,
    paddingHorizontal: 14,
    ...platformShadow({ color: '#000', width: 0, height: 1, opacity: 0.03, radius: 2, elevation: 1 }),
  },
  iconWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.neutral.title,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: colors.status.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
