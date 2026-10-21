import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Circular progress with a short fill animation (the only animation in the app).
 * `children` is drawn in the centre. The ring itself is decorative: pass an
 * `accessibilityLabel` that says the numbers.
 */
export function ProgressRing({
  progress,
  size = 220,
  strokeWidth = 18,
  color,
  accessibilityLabel,
  children,
}: {
  /** 0–1. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  accessibilityLabel: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fill, {
      toValue: clamped,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      // SVG props cannot use the native driver.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, fill]);

  const dashOffset = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? colors.accent}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          // Start at 12 o'clock and fill clockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}
