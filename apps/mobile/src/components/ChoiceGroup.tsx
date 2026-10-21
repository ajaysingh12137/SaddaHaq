import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET } from '../theme/tokens';
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
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
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
                minHeight: TOUCH_TARGET + 8,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.xs,
                borderRadius: radii.md,
                borderWidth: 2,
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? colors.accentSoft : colors.surfaceRaised,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <AppText
                variant="body"
                weight="bold"
                center
                color={selected ? colors.onAccentSoft : colors.text}
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
