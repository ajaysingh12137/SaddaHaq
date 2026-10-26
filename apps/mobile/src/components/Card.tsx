import React from 'react';
import { Pressable, type StyleProp, View, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { cardShadow } from '../theme/tokens';

/**
 * White rounded surface with a soft shadow: the basic building block of each
 * screen. Pass `onPress` (with an accessibility label) to make the whole card tappable.
 */
export function Card({
  children,
  tone = 'raised',
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: {
  children: React.ReactNode;
  /** raised: white card · accent: solid brand colour · soft: tinted, no shadow. */
  tone?: 'raised' | 'accent' | 'soft';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const base: ViewStyle = {
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor:
      tone === 'accent'
        ? colors.accent
        : tone === 'soft'
          ? colors.accentSoft
          : colors.surfaceRaised,
    ...(tone === 'soft' ? null : cardShadow(colors.shadow, tone === 'accent' ? 2 : 1)),
  };

  if (!onPress) {
    return (
      <View style={[base, style]} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [base, { opacity: pressed ? 0.88 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}
