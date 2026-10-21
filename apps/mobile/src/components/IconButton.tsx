import React from 'react';
import { Pressable } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color,
  testID,
}: {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  testID?: string;
}) {
  const { radii } = useTheme();
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
      })}
    >
      <Icon name={icon} size={26} color={color} />
    </Pressable>
  );
}
