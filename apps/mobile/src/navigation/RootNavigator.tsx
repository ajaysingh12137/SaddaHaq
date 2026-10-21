import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '../state/sessionStore';
import { useTheme } from '../theme/ThemeProvider';
import { MainStack } from './MainStack';
import { OnboardingNavigator } from './OnboardingNavigator';

export function RootNavigator() {
  const status = useSession(s => s.status);
  const theme = useTheme();

  const navTheme = useMemo(() => {
    const base = theme.dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.accent,
        background: theme.colors.background,
        card: theme.colors.surfaceRaised,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  if (status === 'booting') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.background,
        }}
        testID="boot-screen"
      >
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    // Keyed by status: the container keeps navigation state across child remounts,
    // so sign-in/out must start a fresh history (e.g. Platforms, not Language).
    <NavigationContainer key={status} theme={navTheme}>
      {status === 'ready' ? <MainStack /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}
