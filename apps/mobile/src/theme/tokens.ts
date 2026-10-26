/**
 * Design tokens. One indigo accent, soft neutral backgrounds with white cards,
 * and status colours. Every text/background pair used in the app is
 * contrast-tested (≥ 4.5:1).
 */
import { Platform } from 'react-native';

import { type Language } from '@saddahaq/shared';

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  onAccentSoft: string;
  good: string;
  onGood: string;
  warning: string;
  onWarning: string;
  danger: string;
  /** Track behind progress rings and bars (decorative, not text). */
  track: string;
  overlay: string;
  /** Card shadow colour (Android elevation tint / iOS shadow). */
  shadow: string;
  goodSoft: string;
  onGoodSoft: string;
  warningSoft: string;
  onWarningSoft: string;
}

export const lightColors: ColorTokens = {
  background: '#F4F6FB',
  surface: '#EDF0F7',
  surfaceRaised: '#FFFFFF',
  border: '#D5DAE5',
  text: '#121826',
  textMuted: '#4F5869',
  accent: '#4338CA',
  onAccent: '#FFFFFF',
  accentSoft: '#E8EAFF',
  onAccentSoft: '#312E81',
  good: '#15803D',
  onGood: '#FFFFFF',
  warning: '#A14A07',
  onWarning: '#FFFFFF',
  danger: '#B91C1C',
  track: '#E3E7F0',
  overlay: 'rgba(18, 24, 38, 0.5)',
  shadow: '#1E2A5A',
  goodSoft: '#DCF5E6',
  onGoodSoft: '#14532D',
  warningSoft: '#FFF1DB',
  onWarningSoft: '#7C2D12',
};

export const darkColors: ColorTokens = {
  background: '#0D1018',
  surface: '#1B2030',
  surfaceRaised: '#151A26',
  border: '#2E3548',
  text: '#F2F4F8',
  textMuted: '#AAB2C3',
  accent: '#A5B4FC',
  onAccent: '#11142B',
  accentSoft: '#262B52',
  onAccentSoft: '#E0E5FF',
  good: '#4ADE80',
  onGood: '#0B0F14',
  warning: '#FBBF24',
  onWarning: '#0B0F14',
  danger: '#F87171',
  track: '#262D3D',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  goodSoft: '#16321F',
  onGoodSoft: '#BBF7D0',
  warningSoft: '#3A2A10',
  onWarningSoft: '#FDE68A',
};

/** 4/8 scale. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Soft card shadow; Android uses elevation, tinted by `shadowColor` on API 28+. */
export function cardShadow(color: string, level: 1 | 2 = 1) {
  return {
    shadowColor: color,
    shadowOpacity: level === 1 ? 0.08 : 0.16,
    shadowRadius: level === 1 ? 10 : 16,
    shadowOffset: { width: 0, height: level === 1 ? 3 : 6 },
    elevation: level === 1 ? 2 : 6,
  } as const;
}

/** Minimum touch target in dp. */
export const TOUCH_TARGET = 48;

export const fontSizes = {
  caption: 16,
  body: 18,
  bodyLarge: 20,
  title: 24,
  heading: 28,
  display: 36,
} as const;

export type FontWeight = 'regular' | 'bold';

/**
 * Bundled Noto fonts on Android (Devanagari for Hindi so matras render
 * correctly). iOS uses the system font until fonts are added to the Xcode project.
 */
export function fontFamily(language: Language, weight: FontWeight): string | undefined {
  if (Platform.OS !== 'android') {
    return undefined;
  }
  const family = language === 'hi' ? 'NotoSansDevanagari' : 'NotoSans';
  return `${family}-${weight === 'bold' ? 'Bold' : 'Regular'}`;
}

/**
 * Devanagari needs taller lines than Latin for vowel signs above and below.
 *
 * On Android, Hindi gets no explicit lineHeight: the bundled Noto Sans Devanagari
 * metrics already make room for the vowel signs, and with a lineHeight set React
 * Native measured short Hindi labels too narrow, so their last word wrapped onto a
 * clipped second line (seen on a Redmi phone, Android 15, RN 0.87).
 */
export function lineHeight(size: number, language: Language): number | undefined {
  if (language === 'hi') {
    return Platform.OS === 'android' ? undefined : Math.round(size * 1.5);
  }
  return Math.round(size * 1.35);
}

export interface Theme {
  dark: boolean;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  fontSizes: typeof fontSizes;
}

export const lightTheme: Theme = { dark: false, colors: lightColors, spacing, radii, fontSizes };
export const darkTheme: Theme = { dark: true, colors: darkColors, spacing, radii, fontSizes };
