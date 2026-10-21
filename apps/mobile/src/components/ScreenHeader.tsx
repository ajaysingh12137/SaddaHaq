import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  backLabel,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {onBack ? (
        <View style={{ marginLeft: -spacing.sm }}>
          <IconButton icon="arrowLeft" accessibilityLabel={backLabel ?? ''} onPress={onBack} />
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
