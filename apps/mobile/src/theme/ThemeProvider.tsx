import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { type Theme, darkTheme, lightTheme } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

const ThemeContext = createContext<Theme>(lightTheme);

export function ThemeProvider({
  preference = 'system',
  children,
}: {
  preference?: ThemePreference;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const theme = useMemo(() => {
    const dark = preference === 'dark' || (preference === 'system' && system === 'dark');
    return dark ? darkTheme : lightTheme;
  }, [preference, system]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
