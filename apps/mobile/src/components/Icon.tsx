import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons/static';
import React from 'react';

import { useTheme } from '../theme/ThemeProvider';

type GlyphName = React.ComponentProps<typeof MaterialDesignIcons>['name'];

/**
 * App icon names → Material Design Icons glyphs (outline style, with a filled
 * variant where one exists for selected states such as the active tab).
 */
const ICONS = {
  home: { outline: 'home-outline', filled: 'home' },
  calendar: { outline: 'calendar-month-outline', filled: 'calendar-month' },
  calendarPlus: { outline: 'calendar-plus' },
  calendarCheck: { outline: 'calendar-check' },
  list: { outline: 'hand-heart-outline', filled: 'hand-heart' },
  sliders: { outline: 'cog-outline', filled: 'cog' },
  speaker: { outline: 'volume-high' },
  stop: { outline: 'stop-circle-outline' },
  check: { outline: 'check-bold' },
  checkCircle: { outline: 'check-circle-outline', filled: 'check-circle' },
  plus: { outline: 'plus' },
  phone: { outline: 'cellphone' },
  phoneMessage: { outline: 'cellphone-message' },
  globe: { outline: 'translate' },
  cloud: { outline: 'cloud-check-outline' },
  chart: { outline: 'chart-bar' },
  arrowLeft: { outline: 'arrow-left' },
  arrowRight: { outline: 'arrow-right' },
  wifiOff: { outline: 'wifi-off' },
  shield: { outline: 'shield-check-outline' },
  lock: { outline: 'shield-lock-outline' },
  info: { outline: 'information-outline' },
  alert: { outline: 'alert-circle-outline' },
  close: { outline: 'close' },
  chevronLeft: { outline: 'chevron-left' },
  chevronRight: { outline: 'chevron-right' },
  image: { outline: 'image-plus-outline' },
  trash: { outline: 'trash-can-outline' },
  fileText: { outline: 'file-document-outline' },
  bank: { outline: 'bank-outline' },
  idCard: { outline: 'card-account-details-outline' },
  download: { outline: 'download' },
  external: { outline: 'open-in-new' },
  call: { outline: 'phone-outline' },
  wave: { outline: 'hand-wave-outline' },
  target: { outline: 'target' },
  clock: { outline: 'clock-outline' },
  health: { outline: 'heart-pulse' },
  umbrella: { outline: 'umbrella-outline' },
  school: { outline: 'school-outline' },
  worker: { outline: 'account-hard-hat-outline' },
  star: { outline: 'star-outline' },
  accident: { outline: 'ambulance' },
  life: { outline: 'account-heart-outline' },
  maternity: { outline: 'mother-heart' },
  oldAge: { outline: 'human-cane' },
  gift: { outline: 'gift-outline' },
} as const satisfies Record<string, { outline: GlyphName; filled?: GlyphName }>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 24,
  color,
  filled = false,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Use the solid variant when there is one (e.g. the active tab). */
  filled?: boolean;
}) {
  const { colors } = useTheme();
  const glyph: { outline: GlyphName; filled?: GlyphName } = ICONS[name];
  return (
    <MaterialDesignIcons
      name={filled && glyph.filled ? glyph.filled : glyph.outline}
      size={size}
      color={color ?? colors.text}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
