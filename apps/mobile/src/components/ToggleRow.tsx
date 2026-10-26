import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Switch, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET, cardShadow } from '../theme/tokens';
import { AppText } from './AppText';
import { type IconName } from './Icon';
import { IconCircle } from './IconCircle';

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
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceRaised,
        ...cardShadow(colors.shadow),
      }}
    >
      {icon ? <IconCircle name={icon} size={40} /> : null}
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
        trackColor={{ true: colors.accent, false: colors.track }}
        thumbColor={colors.surfaceRaised}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}
