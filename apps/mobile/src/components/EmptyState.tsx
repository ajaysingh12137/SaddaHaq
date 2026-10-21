import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }}>
      <Icon name={icon} size={56} color={colors.textMuted} />
      <AppText variant="bodyLarge" tone="muted" center>
        {message}
      </AppText>
    </View>
  );
}
