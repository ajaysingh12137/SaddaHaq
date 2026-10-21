/**
 * Design tokens. One accent colour, neutral greys and two status colours.
 * Every text/background pair used in the app is contrast-tested (≥ 4.5:1).
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
}

export const lightColors: ColorTokens = {
  background: '#FFFFFF',
  surface: '#F3F4F6',
  surfaceRaised: '#FFFFFF',
  border: '#D1D5DB',
  text: '#111827',
  textMuted: '#4B5563',
  accent: '#1D4ED8',
  onAccent: '#FFFFFF',
  accentSoft: '#DBEAFE',
  onAccentSoft: '#1E3A8A',
  good: '#15803D',
  onGood: '#FFFFFF',
  warning: '#B45309',
  onWarning: '#FFFFFF',
  danger: '#B91C1C',
  track: '#E5E7EB',
  overlay: 'rgba(17, 24, 39, 0.5)',
};

export const darkColors: ColorTokens = {
  background: '#0B0F14',
  surface: '#161B22',
  surfaceRaised: '#1F2630',
  border: '#374151',
  text: '#F3F4F6',
  textMuted: '#AEB6C2',
  accent: '#93B4FF',
  onAccent: '#0B0F14',
  accentSoft: '#1E2A4A',
  onAccentSoft: '#DBE6FF',
  good: '#4ADE80',
  onGood: '#0B0F14',
  warning: '#FBBF24',
  onWarning: '#0B0F14',
  danger: '#F87171',
  track: '#2A313C',
  overlay: 'rgba(0, 0, 0, 0.6)',
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
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

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

/** Devanagari needs taller lines than Latin for vowel signs above and below. */
export function lineHeight(size: number, language: Language): number {
  return Math.round(size * (language === 'hi' ? 1.5 : 1.35));
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
