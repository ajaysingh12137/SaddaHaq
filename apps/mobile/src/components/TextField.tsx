import React from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET, fontFamily } from '../theme/tokens';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  prefix?: string;
  error?: string | null;
}

export function TextField({ label, prefix, error, style, ...rest }: TextFieldProps) {
  const { colors, radii, spacing, fontSizes } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="body" weight="bold">
        {label}
      </AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: TOUCH_TARGET + 8,
          borderWidth: 2,
          borderColor: error ? colors.danger : colors.border,
          borderRadius: radii.md,
          backgroundColor: colors.surfaceRaised,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
        }}
      >
        {prefix ? (
          <AppText variant="title" tone="muted" accessibilityElementsHidden>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          maxFontSizeMultiplier={2}
          style={[
            {
              flex: 1,
              fontSize: fontSizes.title,
              color: colors.text,
              // Phone numbers and codes are Latin digits in either language.
              fontFamily: fontFamily('en', 'regular'),
              letterSpacing: 1,
              paddingVertical: spacing.xs,
            },
            style,
          ]}
          {...rest}
        />
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
