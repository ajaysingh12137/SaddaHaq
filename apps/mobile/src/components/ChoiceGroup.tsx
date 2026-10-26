import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET, cardShadow } from '../theme/tokens';
import { AppText } from './AppText';

export interface Choice<T extends string | number> {
  value: T;
  label: string;
}

/** A row of mutually exclusive options (radio buttons drawn as segments). */
export function ChoiceGroup<T extends string | number>({
  label,
  choices,
  value,
  onChange,
  testIDPrefix,
}: {
  label: string;
  choices: ReadonlyArray<Choice<T>>;
  value: T;
  onChange: (value: T) => void;
  testIDPrefix?: string;
}) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <AppText variant="body" weight="bold">
        {label}
      </AppText>
      {/* Segmented control: the chosen option is a raised white pill on a soft track. */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.xxs,
          padding: spacing.xxs,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
        }}
      >
        {choices.map(choice => {
          const selected = choice.value === value;
          return (
            <Pressable
              key={String(choice.value)}
              onPress={() => onChange(choice.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={choice.label}
              testID={testIDPrefix ? `${testIDPrefix}-${choice.value}` : undefined}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: TOUCH_TARGET + 4,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.xs,
                borderRadius: radii.md,
                backgroundColor: selected ? colors.surfaceRaised : 'transparent',
                opacity: pressed ? 0.85 : 1,
                ...(selected ? cardShadow(colors.shadow) : null),
              })}
            >
              <AppText
                variant="body"
                weight="bold"
                center
                color={selected ? colors.accent : colors.textMuted}
              >
                {choice.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
