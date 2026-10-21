import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** A short boxed note: `warning` for unverified content, `info` for tips. */
export function InfoBanner({
  message,
  tone = 'info',
  icon,
  testID,
}: {
  message: string;
  tone?: 'info' | 'warning' | 'good';
  icon?: IconName;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const palette = {
    info: { bg: colors.surface, fg: colors.text, icon: colors.accent },
    warning: { bg: colors.warning, fg: colors.onWarning, icon: colors.onWarning },
    good: { bg: colors.good, fg: colors.onGood, icon: colors.onGood },
  }[tone];
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: palette.bg,
      }}
    >
      <Icon
        name={icon ?? (tone === 'info' ? 'info' : tone === 'good' ? 'check' : 'shield')}
        color={palette.icon}
      />
      <AppText variant="body" color={palette.fg} style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}
