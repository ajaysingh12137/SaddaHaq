import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '../components/Icon';
import { HomeScreen } from '../features/home/HomeScreen';
import { LogScreen } from '../features/log/LogScreen';
import { SchemesScreen } from '../features/schemes/SchemesScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../theme/ThemeProvider';
import { fontFamily } from '../theme/tokens';
import { type MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Defined outside render so React keeps the same component type between renders. */
const tabIcon =
  (name: IconName) =>
  ({ color }: { color: string }) => <Icon name={name} color={color} size={26} />;

const TAB_ICONS: Record<keyof MainTabParamList, IconName> = {
  Home: 'home',
  Log: 'calendar',
  Schemes: 'list',
  Settings: 'sliders',
};

export function MainTabs() {
  const { t } = useTranslation();
  const { colors, fontSizes } = useTheme();
  const language = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surfaceRaised,
          borderTopColor: colors.border,
          minHeight: 64,
        },
        tabBarLabelStyle: { fontSize: fontSizes.caption, fontFamily: fontFamily(language, 'bold') },
        tabBarIcon: tabIcon(TAB_ICONS[route.name]),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="Log" component={LogScreen} options={{ title: t('tabs.log') }} />
      <Tab.Screen name="Schemes" component={SchemesScreen} options={{ title: t('tabs.schemes') }} />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tabs.settings') }}
      />
    </Tab.Navigator>
  );
}
