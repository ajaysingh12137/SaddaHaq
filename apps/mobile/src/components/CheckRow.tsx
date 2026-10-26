import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon } from './Icon';

/** A tickable list item; the whole row is the touch target. */
export function CheckRow({
  label,
  checked,
  onChange,
  testID,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: TOUCH_TARGET + 8,
        paddingHorizontal: spacing.md,
        borderRadius: radii.md,
        backgroundColor: checked ? colors.goodSoft : colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: radii.pill,
          borderWidth: 2,
          borderColor: checked ? colors.good : colors.textMuted,
          backgroundColor: checked ? colors.good : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Icon name="check" size={18} color={colors.onGood} /> : null}
      </View>
      <AppText
        variant="body"
        weight={checked ? 'bold' : 'regular'}
        color={checked ? colors.onGoodSoft : colors.text}
        style={{ flex: 1 }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
