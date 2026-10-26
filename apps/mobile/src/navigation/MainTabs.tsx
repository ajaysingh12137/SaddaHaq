import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icon, type IconName } from '../components/Icon';
import { HomeScreen } from '../features/home/HomeScreen';
import { LogScreen } from '../features/log/LogScreen';
import { SchemesScreen } from '../features/schemes/SchemesScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../theme/ThemeProvider';
import { cardShadow, fontFamily } from '../theme/tokens';
import { type MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** The active tab gets a filled icon on a soft pill (Material 3 style). */
function TabIcon({ name, color, focused }: { name: IconName; color: string; focused: boolean }) {
  const { colors, radii } = useTheme();
  return (
    <View
      style={{
        width: 60,
        height: 32,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.accentSoft : 'transparent',
      }}
    >
      <Icon name={name} color={color} size={24} filled={focused} />
    </View>
  );
}

/** Defined outside render so React keeps the same component type between renders. */
const tabIcon =
  (name: IconName) =>
  ({ color, focused }: { color: string; focused: boolean }) => (
    <TabIcon name={name} color={color} focused={focused} />
  );

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
          borderTopWidth: 0,
          minHeight: 72,
          paddingTop: 8,
          ...cardShadow(colors.shadow, 2),
        },
        tabBarLabelStyle: {
          fontSize: fontSizes.caption - 2,
          fontFamily: fontFamily(language, 'bold'),
        },
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
