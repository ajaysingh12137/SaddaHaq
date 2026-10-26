import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { type IconName } from './Icon';
import { IconCircle } from './IconCircle';

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
    info: {
      bg: colors.accentSoft,
      fg: colors.onAccentSoft,
      icon: colors.accent,
      circle: colors.surfaceRaised,
    },
    warning: {
      bg: colors.warningSoft,
      fg: colors.onWarningSoft,
      icon: colors.warning,
      circle: colors.surfaceRaised,
    },
    good: {
      bg: colors.goodSoft,
      fg: colors.onGoodSoft,
      icon: colors.good,
      circle: colors.surfaceRaised,
    },
  }[tone];
  return (
    <View
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        paddingRight: spacing.md,
        borderRadius: radii.lg,
        backgroundColor: palette.bg,
      }}
    >
      <IconCircle
        name={icon ?? (tone === 'info' ? 'info' : tone === 'good' ? 'checkCircle' : 'alert')}
        color={palette.icon}
        background={palette.circle}
        size={40}
      />
      <AppText variant="body" color={palette.fg} style={{ flex: 1 }}>
        {message}
      </AppText>
    </View>
  );
}
