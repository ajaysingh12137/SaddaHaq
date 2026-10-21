import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';

/** Simple 24×24 stroke icons drawn for this app (no third-party icon set). */
const ICONS = {
  home: <Path d="M3 11 12 3l9 8M5 9.5V21h14V9.5" />,
  calendar: (
    <>
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  list: (
    <>
      <Path d="M9 6h12M9 12h12M9 18h12" />
      <Circle cx={4.5} cy={6} r={1.2} />
      <Circle cx={4.5} cy={12} r={1.2} />
      <Circle cx={4.5} cy={18} r={1.2} />
    </>
  ),
  sliders: (
    <>
      <Path d="M4 6h16M4 12h16M4 18h16" />
      <Circle cx={9} cy={6} r={2.2} />
      <Circle cx={15} cy={12} r={2.2} />
      <Circle cx={7} cy={18} r={2.2} />
    </>
  ),
  speaker: <Path d="M4 9h4l5-4v14l-5-4H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11" />,
  stop: <Rect x={6} y={6} width={12} height={12} rx={2} />,
  check: <Path d="m5 12.5 4.5 4.5L19 7" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  phone: (
    <>
      <Rect x={7} y={2.5} width={10} height={19} rx={2} />
      <Path d="M11 18h2" />
    </>
  ),
  globe: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  cloud: <Path d="M7 18h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18z" />,
  chart: <Path d="M5 20v-8M12 20V5M19 20v-11" />,
  arrowLeft: <Path d="M19 12H5M11 6l-6 6 6 6" />,
  arrowRight: <Path d="M5 12h14M13 6l6 6-6 6" />,
  wifiOff: (
    <Path d="m3 3 18 18M5 12.5a10 10 0 0 1 5-2.7M14.5 10a10 10 0 0 1 4.5 2.5M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" />
  ),
  shield: <Path d="M12 3 20 6v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z" />,
  info: (
    <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v6M12 7.5h.01" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size = 24,
  color,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? colors.text}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ICONS[name]}
    </Svg>
  );
}
