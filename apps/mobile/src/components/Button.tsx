import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** Use at most one `primary` per screen. */
export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent, border: colors.accent },
    secondary: { bg: colors.accentSoft, fg: colors.onAccentSoft, border: colors.accentSoft },
    ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radii.md,
          paddingHorizontal: spacing.lg,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.row, { gap: spacing.xs }]}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : icon ? (
          <Icon name={icon} color={palette.fg} />
        ) : null}
        <AppText variant="bodyLarge" weight="bold" color={palette.fg}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET + 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
