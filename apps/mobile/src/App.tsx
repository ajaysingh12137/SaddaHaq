import NetInfo from '@react-native-community/netinfo';
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { AppState, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from './components/AppText';
import { Button } from './components/Button';
import { i18next } from './i18n';
import en from './i18n/locales/en.json';
import hi from './i18n/locales/hi.json';
import { RootNavigator } from './navigation/RootNavigator';
import { bootstrap, flushProfile } from './services/session';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';

// TanStack Query follows real connectivity and app focus.
onlineManager.setEventListener(setOnline =>
  NetInfo.addEventListener(state => setOnline(state.isConnected !== false)),
);
focusManager.setEventListener(handleFocus => {
  const subscription = AppState.addEventListener('change', status =>
    handleFocus(status === 'active'),
  );
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 5 * 60_000 },
    mutations: { retry: 0 },
  },
});

function StatusBarForTheme() {
  const { dark } = useTheme();
  // Edge-to-edge (RN 0.87): only the icon colour is ours to set.
  return <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />;
}

function StartupError({ onRetry }: { onRetry: () => void }) {
  const { colors, spacing } = useTheme();
  // i18next may not be initialised, so read both languages straight from the bundles.
  const message = [hi.startup.failed, en.startup.failed].join('\n');
  const retry = `${hi.startup.retry} / ${en.startup.retry}`;
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: spacing.lg,
        gap: spacing.md,
        backgroundColor: colors.background,
      }}
    >
      <AppText variant="title" center>
        {message}
      </AppText>
      <Button label={retry} onPress={onRetry} />
    </View>
  );
}

export default function App() {
  const [failed, setFailed] = useState(false);

  const start = () => {
    setFailed(false);
    bootstrap().catch(() => setFailed(true));
  };

  useEffect(() => {
    start();
    // Push queued profile changes when the connection comes back.
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        void flushProfile();
      }
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18next}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <StatusBarForTheme />
            {failed ? <StartupError onRetry={start} /> : <RootNavigator />}
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
