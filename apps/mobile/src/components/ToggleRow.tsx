import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** The whole row is the touch target, not just the small switch. */
export function ToggleRow({
  title,
  body,
  icon,
  value,
  onChange,
  testID,
}: {
  title: string;
  body?: string;
  icon?: IconName;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${title}, ${value ? t('common.on') : t('common.off')}`}
      accessibilityHint={body}
      testID={testID}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: TOUCH_TARGET + 16,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
      }}
    >
      {icon ? <Icon name={icon} color={colors.accent} /> : null}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="body" weight="bold">
          {title}
        </AppText>
        {body ? (
          <AppText variant="caption" tone="muted">
            {body}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={colors.surfaceRaised}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}
