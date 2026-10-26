import React from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET, cardShadow } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color,
  filled = false,
  testID,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  /** Draw a white circle behind the icon (back buttons, sheet close). */
  filled?: boolean;
  testID?: string;
}) {
  const { colors, radii } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      testID={testID}
      style={({ pressed }) => ({
        width: TOUCH_TARGET,
        height: TOUCH_TARGET,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.6 : 1,
        ...(filled
          ? { backgroundColor: colors.surfaceRaised, ...cardShadow(colors.shadow) }
          : null),
      })}
    >
      <Icon name={icon} size={filled ? 24 : 26} color={color} />
    </Pressable>
  );
}
