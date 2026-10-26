import React from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';

/** An icon on a tinted circle: list rows, banners and empty states. */
export function IconCircle({
  name,
  size = 44,
  color,
  background,
}: {
  name: IconName;
  size?: number;
  color?: string;
  background?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background ?? colors.accentSoft,
      }}
    >
      <Icon name={name} size={Math.round(size * 0.55)} color={color ?? colors.accent} />
    </View>
  );
}
