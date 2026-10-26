import React, { useState } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { TOUCH_TARGET, fontFamily } from '../theme/tokens';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  prefix?: string;
  error?: string | null;
}

export function TextField({
  label,
  prefix,
  error,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors, radii, spacing, fontSizes } = useTheme();
  const [focused, setFocused] = useState(false);

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
          borderColor: error ? colors.danger : focused ? colors.accent : colors.border,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceRaised,
          paddingHorizontal: spacing.md,
          gap: spacing.xs,
        }}
      >
        {prefix ? (
          <View
            style={{
              paddingRight: spacing.sm,
              marginRight: spacing.xxs,
              borderRightWidth: 1.5,
              borderRightColor: colors.border,
            }}
          >
            <AppText variant="title" tone="muted" accessibilityElementsHidden>
              {prefix}
            </AppText>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textMuted}
          cursorColor={colors.accent}
          selectionColor={colors.accentSoft}
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
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
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
