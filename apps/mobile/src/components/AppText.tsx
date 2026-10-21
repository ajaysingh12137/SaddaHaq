import React from 'react';
import { Text, type TextProps } from 'react-native';

import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../theme/ThemeProvider';
import { type ColorTokens, type FontWeight, fontFamily, lineHeight } from '../theme/tokens';

export type TextVariant = 'display' | 'heading' | 'title' | 'bodyLarge' | 'body' | 'caption';
export type TextTone = 'default' | 'muted' | 'accent' | 'good' | 'warning' | 'danger' | 'onAccent';

const toneColor = (tone: TextTone, colors: ColorTokens): string =>
  ({
    default: colors.text,
    muted: colors.textMuted,
    accent: colors.accent,
    good: colors.good,
    warning: colors.warning,
    danger: colors.danger,
    onAccent: colors.onAccent,
  })[tone];

const defaultWeight: Record<TextVariant, FontWeight> = {
  display: 'bold',
  heading: 'bold',
  title: 'bold',
  bodyLarge: 'regular',
  body: 'regular',
  caption: 'regular',
};

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: FontWeight;
  color?: string;
  center?: boolean;
}

/** All app text. Picks the right script font and respects system font scaling. */
export function AppText({
  variant = 'body',
  tone = 'default',
  weight,
  color,
  center,
  style,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  const language = useLanguage();
  const size = theme.fontSizes[variant];
  const resolvedWeight = weight ?? defaultWeight[variant];
  const family = fontFamily(language, resolvedWeight);

  return (
    <Text
      maxFontSizeMultiplier={2}
      accessibilityRole={variant === 'heading' || variant === 'display' ? 'header' : undefined}
      style={[
        {
          fontSize: size,
          lineHeight: lineHeight(size, language),
          color: color ?? toneColor(tone, theme.colors),
          fontFamily: family,
          // Custom font files carry their own weight; only set it for system fonts.
          fontWeight: family ? undefined : resolvedWeight === 'bold' ? '700' : '400',
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
      {...rest}
    />
  );
}
