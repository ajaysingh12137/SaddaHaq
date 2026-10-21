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
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  chevronLeft: <Path d="m15 5-7 7 7 7" />,
  chevronRight: <Path d="m9 5 7 7-7 7" />,
  image: (
    <>
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Circle cx={9} cy={10} r={1.8} />
      <Path d="m21 16-5-5-9 9" />
    </>
  ),
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  fileText: <Path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />,
  bank: <Path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18" />,
  idCard: (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={9} cy={11} r={2} />
      <Path d="M6 16c.6-1.5 1.7-2 3-2s2.4.5 3 2M14 10h4M14 14h3" />
    </>
  ),
  download: <Path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  external: <Path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  call: (
    <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
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
