import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useOnline } from '../hooks/useOnline';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function OfflineBanner() {
  const online = useOnline();
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  if (online) {
    return null;
  }
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID="offline-banner"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.warning,
      }}
    >
      <Icon name="wifiOff" size={20} color={colors.onWarning} />
      <AppText variant="caption" color={colors.onWarning} style={{ flex: 1 }}>
        {t('common.offline')}
      </AppText>
    </View>
  );
}
