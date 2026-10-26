import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { type IconName } from './Icon';
import { IconCircle } from './IconCircle';

export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }}>
      <IconCircle name={icon} size={96} />
      <AppText variant="bodyLarge" tone="muted" center>
        {message}
      </AppText>
    </View>
  );
}
