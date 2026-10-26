import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { type IconName } from './Icon';
import { IconButton } from './IconButton';
import { IconCircle } from './IconCircle';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  icon,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  /** Large icon above the title, for onboarding and other single-task screens. */
  icon?: IconName;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs, paddingTop: spacing.xs }}>
      {onBack ? (
        <View style={{ marginLeft: -spacing.xxs, marginBottom: spacing.xxs }}>
          <IconButton
            icon="arrowLeft"
            accessibilityLabel={backLabel ?? ''}
            onPress={onBack}
            filled
          />
        </View>
      ) : null}
      {icon ? (
        <View style={{ marginTop: spacing.xs, marginBottom: spacing.xs }}>
          <IconCircle name={icon} size={72} />
        </View>
      ) : null}
      <AppText variant="heading">{title}</AppText>
      {subtitle ? (
        <AppText variant="bodyLarge" tone="muted">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}
